const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

function toPrismaField (column) {
  const name = column.Field
  const type = String(column.Type).toLowerCase()
  const isNullable = column.Null === 'YES'
  const isPrimary = column.Key === 'PRI'
  const defaultVal = column.Default

  let prismaType = 'String'
  let dbAttr = ''
  let extras = []

  if (type.startsWith('bigint')) {
    prismaType = 'BigInt'
  } else if (type.startsWith('int')) {
    prismaType = 'Int'
  } else if (type.startsWith('tinyint(1)')) {
    prismaType = 'Boolean'
  } else if (type.startsWith('float')) {
    prismaType = 'Float'
    dbAttr = '@db.Float'
  } else if (type.startsWith('double')) {
    prismaType = 'Float'
    dbAttr = '@db.Double'
  } else if (type.startsWith('decimal')) {
    prismaType = 'Decimal'
  } else if (type.startsWith('varchar')) {
    prismaType = 'String'
    const size = type.match(/varchar\((\d+)\)/)
    dbAttr = size ? `@db.VarChar(${size[1]})` : '@db.VarChar(255)'
  } else if (type === 'text') {
    prismaType = 'String'
    dbAttr = '@db.Text'
  } else if (type === 'longtext') {
    prismaType = 'String'
    dbAttr = '@db.LongText'
  } else if (type.startsWith('json')) {
    prismaType = 'Json'
  } else if (type.startsWith('vector')) {
    const dim = type.match(/vector\((\d+)\)/)
    prismaType = `Unsupported("VECTOR(${dim ? dim[1] : '1024'})")`
  } else if (type.startsWith('datetime')) {
    prismaType = 'DateTime'
  } else if (type.startsWith('timestamp')) {
    prismaType = 'DateTime'
  } else if (type.startsWith('char')) {
    prismaType = 'String'
  }

  let modifiers = ''
  if (isPrimary) {
    extras.push('@id')
  }
  if (String(defaultVal).toLowerCase().includes('auto_increment')) {
    extras.push('@default(autoincrement())')
  }
  if (dbAttr) {
    extras.push(dbAttr)
  }

  const optional = isNullable && !isPrimary ? '?' : ''
  const extrasJoined = extras.join(' ')
  return { name, line: `${name} ${prismaType}${optional} ${extrasJoined}`.trim() }
}

function generateModelBlock (tableName, describeRows) {
  const modelName = 'MoviesWithRating'
  const lines = []
  lines.push(`model ${modelName} {`)
  describeRows.forEach((col) => {
    const field = toPrismaField(col)
    lines.push(`  ${field.line}`)
  })
  lines.push('')
  lines.push(`  @@map("${tableName}")`)
  lines.push('}')
  return lines.join('\n')
}

function replaceModelInSchema (schemaContent, newModelBlock) {
  const startRe = /\nmodel\s+MoviesWithRating\s*\{/m
  const startMatch = schemaContent.match(startRe)
  if (!startMatch) return null
  const startIdx = startMatch.index
  let brace = 0
  let i = startIdx
  for (; i < schemaContent.length; i++) {
    const ch = schemaContent[i]
    if (ch === '{') brace++
    else if (ch === '}') {
      brace--
      if (brace === 0) {
        i++
        break
      }
    }
  }
  const before = schemaContent.slice(0, startIdx)
  const after = schemaContent.slice(i)
  const leadingNewline = before.endsWith('\n') ? '' : '\n'
  return `${before}${leadingNewline}${newModelBlock}${after}`
}

async function main () {
  const url = process.env.DATABASE_URL_BACK
  if (!url) {
    console.error('❌ 未检测到环境变量 DATABASE_URL_BACK')
    process.exit(1)
  }

  console.log('🔌 测试 DATABASE_URL_BACK 连接...')
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error']
  })

  try {
    await prisma.$connect()
    console.log('✅ 连接成功')
  } catch (e) {
    console.error('❌ 连接失败:', e.message)
    process.exit(1)
  }

  const tableName = 'movies'
  console.log(`\n🔎 查看表结构: ${tableName}`)
  let describeRows
  try {
    describeRows = await prisma.$queryRawUnsafe(`DESCRIBE ${tableName}`)
  } catch (e) {
    console.error('❌ DESCRIBE 执行失败:', e.message)
    await prisma.$disconnect()
    process.exit(1)
  }

  console.table(describeRows)

  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
  const original = fs.readFileSync(schemaPath, 'utf8')

  const newModelBlock = generateModelBlock(tableName, describeRows)

  const containsModel = /model\s+MoviesWithRating\s*\{[\s\S]*?\}/m.test(original)
  if (!containsModel) {
    console.log('\nℹ️ 未在 schema.prisma 中找到 MoviesWithRating 模型，将追加新模型')
    const appended = original.trimEnd() + '\n\n' + newModelBlock + '\n'
    fs.writeFileSync(schemaPath, appended)
    console.log('✨ 已写入新的 MoviesWithRating 模型，并映射到 movies 表')
  } else {
    const candidate = replaceModelInSchema(original, newModelBlock)
    if (!candidate) {
      console.log('\n⚠️ 无法替换现有模型，跳过更新')
    } else if (candidate !== original) {
      fs.writeFileSync(schemaPath, candidate)
      console.log('\n✨ 发现不一致，已更新 schema.prisma 中的 MoviesWithRating 模型')
    } else {
      console.log('\n✅ schema.prisma 与数据库表结构一致，无需修改')
    }
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ 脚本异常:', e)
  process.exit(1)
})


