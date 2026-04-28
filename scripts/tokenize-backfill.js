const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const index = trimmed.indexOf('=')
    if (index <= 0) continue

    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function isValidIdentifier(identifier) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    table: 'movie_corpus',
    sourceColumn: 'summary',
    tokenColumn: 'summary_tokens',
    batchSize: 200,
    dbUrlEnv: 'DATABASE_URL_BACK',
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    if (arg === '--table' && next) {
      options.table = next
      i++
      continue
    }
    if (arg === '--source' && next) {
      options.sourceColumn = next
      i++
      continue
    }
    if (arg === '--token' && next) {
      options.tokenColumn = next
      i++
      continue
    }
    if (arg === '--batch' && next) {
      const num = Number(next)
      if (Number.isFinite(num) && num > 0) {
        options.batchSize = Math.floor(num)
      }
      i++
      continue
    }
    if (arg === '--env' && next) {
      options.dbUrlEnv = next
      i++
      continue
    }
  }

  return options
}

async function ensureColumnExists(prisma, dbName, tableName, tokenColumn) {
  const columnInfo = await prisma.$queryRaw`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ${dbName}
      AND TABLE_NAME = ${tableName}
      AND COLUMN_NAME = ${tokenColumn}
    LIMIT 1
  `

  if (columnInfo.length > 0) {
    console.log(`ℹ️ 分词列已存在: ${tokenColumn}`)
    return
  }

  console.log(`🧱 分词列不存在，开始新增列: ${tokenColumn}`)
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`${tableName}\` ADD COLUMN \`${tokenColumn}\` LONGTEXT NULL`
  )
  console.log('✅ 分词列新增成功')
}

async function resolvePrimaryKeys(prisma, dbName, tableName) {
  const pkRows = await prisma.$queryRaw`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ${dbName}
      AND TABLE_NAME = ${tableName}
      AND COLUMN_KEY = 'PRI'
    ORDER BY ORDINAL_POSITION ASC
  `

  if (pkRows.length > 0) {
    return pkRows.map((row) => row.COLUMN_NAME)
  }

  const anyColumn = await prisma.$queryRaw`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ${dbName}
      AND TABLE_NAME = ${tableName}
    ORDER BY ORDINAL_POSITION ASC
    LIMIT 1
  `

  if (anyColumn.length === 0) {
    throw new Error(`表 ${tableName} 没有可用字段`)
  }

  return [anyColumn[0].COLUMN_NAME]
}

function normalizeTokens(tokenValue) {
  if (Array.isArray(tokenValue)) {
    return tokenValue.join(' ')
  }
  if (typeof tokenValue === 'string') {
    return tokenValue
  }
  return ''
}

async function main() {
  loadEnvFile()
  const options = parseArgs()

  if (
    !isValidIdentifier(options.table) ||
    !isValidIdentifier(options.sourceColumn) ||
    !isValidIdentifier(options.tokenColumn)
  ) {
    throw new Error('表名/字段名仅允许字母、数字、下划线，且不能以数字开头')
  }

  const dbUrl = process.env[options.dbUrlEnv]
  if (!dbUrl) {
    throw new Error(`未找到环境变量 ${options.dbUrlEnv}`)
  }

  console.log('📌 脚本参数:')
  console.log(
    JSON.stringify(
      {
        table: options.table,
        sourceColumn: options.sourceColumn,
        tokenColumn: options.tokenColumn,
        batchSize: options.batchSize,
        dbUrlEnv: options.dbUrlEnv,
      },
      null,
      2
    )
  )

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: ['error'],
  })

  try {
    console.log('\n🔌 开始测试数据库连接...')
    await prisma.$connect()
    const ping = await prisma.$queryRaw`SELECT DATABASE() AS dbName, NOW() AS nowTime`
    const dbName = ping[0]?.dbName

    if (!dbName) {
      throw new Error('无法获取当前数据库名，请检查连接串是否包含数据库名')
    }

    console.log(`✅ 连接成功，当前数据库: ${dbName}`)

    const tableRows = await prisma.$queryRaw`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ${dbName}
        AND TABLE_NAME = ${options.table}
      LIMIT 1
    `

    if (tableRows.length === 0) {
      throw new Error(`表不存在: ${options.table}`)
    }

    const sourceColRows = await prisma.$queryRaw`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ${dbName}
        AND TABLE_NAME = ${options.table}
        AND COLUMN_NAME = ${options.sourceColumn}
      LIMIT 1
    `

    if (sourceColRows.length === 0) {
      throw new Error(
        `源文本列不存在: ${options.sourceColumn}（表: ${options.table}）`
      )
    }

    await ensureColumnExists(prisma, dbName, options.table, options.tokenColumn)

    const primaryKeys = await resolvePrimaryKeys(prisma, dbName, options.table)
    console.log(`🔑 使用主键字段: ${primaryKeys.join(', ')}`)

    const countRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS total
       FROM \`${options.table}\`
       WHERE \`${options.sourceColumn}\` IS NOT NULL
         AND TRIM(\`${options.sourceColumn}\`) <> ''`
    )
    const total = Number(countRows[0]?.total || 0)
    console.log(`📚 待处理数据量（源列非空）: ${total}`)

    let processed = 0
    while (true) {
      const selectSql = `SELECT ${primaryKeys
        .map((key) => `\`${key}\``)
        .join(', ')}, \`${options.sourceColumn}\` AS source_text
        FROM \`${options.table}\`
        WHERE \`${options.sourceColumn}\` IS NOT NULL
          AND TRIM(\`${options.sourceColumn}\`) <> ''
          AND (\`${options.tokenColumn}\` IS NULL OR TRIM(\`${options.tokenColumn}\`) = '')
        LIMIT ${options.batchSize}`

      const rows = await prisma.$queryRawUnsafe(selectSql)
      if (!rows.length) break

      for (const row of rows) {
        const sourceText = row.source_text
        if (!sourceText || !String(sourceText).trim()) {
          continue
        }

        const tokenizeRows = await prisma.$queryRaw`
          SELECT tokenize(${String(sourceText)}, 'IK') AS token_value
        `
        const tokenValue = tokenizeRows?.[0]?.token_value
        const tokenText = normalizeTokens(tokenValue)

        const whereClause = primaryKeys
          .map((key) => `\`${key}\` = ?`)
          .join(' AND ')
        const updateSql = `UPDATE \`${options.table}\`
          SET \`${options.tokenColumn}\` = ?
          WHERE ${whereClause}
          LIMIT 1`
        const params = [tokenText, ...primaryKeys.map((key) => row[key])]
        await prisma.$executeRawUnsafe(updateSql, ...params)
        processed += 1
      }

      console.log(`🚚 已处理 ${processed} 条`)
      if (rows.length < options.batchSize) {
        break
      }
    }

    const doneRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS done
       FROM \`${options.table}\`
       WHERE \`${options.sourceColumn}\` IS NOT NULL
         AND TRIM(\`${options.sourceColumn}\`) <> ''
         AND \`${options.tokenColumn}\` IS NOT NULL
         AND TRIM(\`${options.tokenColumn}\`) <> ''`
    )
    const done = Number(doneRows[0]?.done || 0)

    const previewSelectFields = [
      ...primaryKeys.map((key) => `\`${key}\``),
      `LEFT(\`${options.sourceColumn}\`, 60) AS source_preview`,
      `LEFT(\`${options.tokenColumn}\`, 120) AS token_preview`,
    ].join(', ')
    const previewRows = await prisma.$queryRawUnsafe(
      `SELECT ${previewSelectFields}
       FROM \`${options.table}\`
       WHERE \`${options.tokenColumn}\` IS NOT NULL
         AND TRIM(\`${options.tokenColumn}\`) <> ''
       LIMIT 5`
    )

    console.log('\n✅ 分词列处理完成')
    console.log(`- 实际更新条数: ${processed}`)
    console.log(`- 当前已完成条数: ${done}`)
    console.log('- 分词结果预览:')
    console.table(previewRows)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('\n❌ 脚本执行失败:', error.message)
  process.exit(1)
})
