const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDatabaseStructure () {
  try {
    console.log('🔍 检查数据库表结构...\n')

    // 查询 movie_corpus 表结构
    const tableStructure = await prisma.$queryRaw`
      DESCRIBE movie_corpus
    `

    console.log('📋 movie_corpus 表字段信息:')
    console.table(tableStructure)

    // 查询表记录数
    const count = await prisma.movieCorpus.count()
    console.log(`\n📊 表记录总数: ${count}`)

    // 查询一些示例数据
    const sampleData = await prisma.movieCorpus.findMany({
      take: 3,
      select: {
        id: true,
        title: true,
        year: true,
        ratingScore: true,
        summaryEmbedding: true
      }
    })

    console.log('\n📝 示例数据:')
    console.table(sampleData)

    // 检查 embedding 字段的数据
    const embeddingCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM movie_corpus WHERE embedding IS NOT NULL
    `
    console.log('\n🔢 embedding 字段非空记录数:', embeddingCount[0].count)

    // 检查 summary_embedding 字段的数据
    const summaryEmbeddingCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM movie_corpus WHERE summary_embedding IS NOT NULL AND summary_embedding != ''
    `
    console.log('🔢 summary_embedding 字段非空记录数:', summaryEmbeddingCount[0].count)

  } catch (error) {
    console.error('❌ 查询失败:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabaseStructure()
