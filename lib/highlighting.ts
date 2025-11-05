// lib/textSegmentation.ts

/**
 * 调用分词 API 进行中文分词
 * @param text 待分词文本
 * @param mode 分词模式：'cut' | 'cutHMM' | 'cutAll' | 'cutForSearch' | 'cutSmall'
 * @returns 分词结果数组
 */
export async function segmentTextAPI(
  text: string,
  mode:
    | 'cut'
    | 'cutHMM'
    | 'cutAll'
    | 'cutForSearch'
    | 'cutSmall' = 'cutForSearch'
): Promise<string[]> {
  try {
    const response = await fetch('/api/segment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, mode }),
    })

    if (!response.ok) {
      throw new Error(`分词 API 错误: ${response.status}`)
    }

    const data = await response.json()
    if (data.success) {
      return data.data.words
    } else {
      throw new Error(data.error || '分词失败')
    }
  } catch (error) {
    console.error('分词 API 调用失败:', error)
    // 降级到简单分词
    return segmentTextSync(text)
  }
}

/**
 * 同步分词（降级方案，当 API 不可用时使用）
 */
export function segmentTextSync(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return []
  }

  const cleaned = text.trim()
  const hasSpaces = /\s/.test(cleaned)

  if (hasSpaces) {
    // 包含空格：先按空格分割，然后处理中文部分
    const parts = cleaned.split(/\s+/).filter((p) => p.length > 0)
    const allSegments: string[] = []

    parts.forEach((part) => {
      if (/[\u4e00-\u9fa5]/.test(part)) {
        // 中文：提取2-4字词组（限制数量）
        allSegments.push(...extractChinesePhrasesLimited(part))
      } else {
        // 英文：直接添加
        allSegments.push(part)
      }
    })

    return [...new Set(allSegments)]
  }

  // 纯中文
  if (/[\u4e00-\u9fa5]/.test(cleaned)) {
    return extractChinesePhrasesLimited(cleaned)
  }

  // 纯英文或其他
  return [cleaned]
}

/**
 * 提取中文词组（限制数量，避免性能问题）
 */
function extractChinesePhrasesLimited(text: string, maxPhrases = 15): string[] {
  const phrases: string[] = []
  const textLength = text.length

  if (textLength <= 2) {
    return [text]
  }

  // 添加完整文本
  phrases.push(text)

  // 电影相关关键词词典（根据业务扩展）
  const movieKeywords = [
    '家庭',
    '关系',
    '修复',
    '温暖',
    '治愈',
    '电影',
    '科幻',
    '爱情',
    '动作',
    '喜剧',
    '剧情',
    '悬疑',
    '恐怖',
    '冒险',
    '动画',
    '导演',
    '演员',
    '主演',
    '推荐',
    '主题',
    '反转',
    '成长',
    '女性',
    '男性',
    '温暖治愈',
    '家庭关系',
  ]

  // 提取匹配的关键词
  movieKeywords.forEach((keyword) => {
    if (text.includes(keyword) && !phrases.includes(keyword)) {
      phrases.push(keyword)
    }
  })

  // 如果还没达到上限，提取2-3字词组
  if (phrases.length < maxPhrases) {
    const stopWords = new Set(['的', '了', '和', '与', '及', '或', '但', '而'])
    for (let len = 2; len <= 3 && phrases.length < maxPhrases; len++) {
      for (
        let i = 0;
        i <= textLength - len && phrases.length < maxPhrases;
        i++
      ) {
        const phrase = text.substring(i, i + len)
        // 跳过包含停用词的组合
        if (
          !stopWords.has(phrase[0]) &&
          !stopWords.has(phrase[1]) &&
          !phrases.includes(phrase)
        ) {
          phrases.push(phrase)
        }
      }
    }
  }

  return [...new Set(phrases)]
    .sort((a, b) => b.length - a.length)
    .slice(0, maxPhrases)
}

// 高亮文本片段类型
interface HighlightText {
  type: 'hit' | 'text' // 'hit' 表示匹配的文本，'text' 表示普通文本
  value: string // 文本内容
}

// 高亮字段类型
interface HighlightField {
  path: string // 字段路径
  texts: HighlightText[] // 文本片段数组
}

// 高亮结果类型
interface HighlightResult {
  __html: string // 包含 HTML 标签的字符串
}

function extractChinesPhrases(text: string): string[] {
  const phrases: string[] = []
  phrases.push(text)
  for (let len = 2; len <= Math.min(4, text.length); len++) {
    for (let i = 0; i <= text.length - len; i++) {
      const phrase = text.substring(i, i + len)
      if (phrase.length >= 2) {
        phrases.push(phrase)
      }
    }
  }
  return [...new Set(phrases)].sort((a, b) => b.length - a.length)
}

// 手动构造高亮数据的函数 - 支持空格分隔的多词搜索
async function createHighlightsManually(
  originalData: Record<string, any>,
  searchQuery: string,
  fieldsToHighlight: string[] = [
    'title',
    'summary',
    'actors',
    'directors',
    'genres',
  ]
): Promise<HighlightField[]> {
  const highlightsField: HighlightField[] = []

  // 处理搜索查询：去除首尾空格，分割为多个词，过滤空字符串
  const searchTerms = searchQuery
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 0)

  // let searchTerms: string[]

  // searchTerms = await segmentTextAPI(searchQuery, 'cut')

  // console.log('searchTerms', searchTerms)

  // 如果没有有效的搜索词，返回空数组
  if (searchTerms.length === 0) {
    return highlightsField
  }

  fieldsToHighlight.forEach((fieldName) => {
    const fieldValue = originalData[fieldName]

    if (!fieldValue || typeof fieldValue !== 'string') {
      return // 跳过空值或非字符串字段
    }

    // 创建该字段的高亮数据（支持多词搜索）
    const fieldHighlights = createFieldHighlights(fieldValue, searchTerms)

    if (fieldHighlights.length > 0) {
      highlightsField.push({
        path: fieldName,
        texts: fieldHighlights,
      })
    }
  })

  return highlightsField
}

// 为单个字段创建高亮数据 - 支持多词搜索
function createFieldHighlights(
  fieldValue: string,
  searchTerms: string[]
): HighlightText[] {
  const texts: HighlightText[] = []

  // 如果没有搜索词，返回整个字段作为普通文本
  if (searchTerms.length === 0) {
    return [{ type: 'text', value: fieldValue }]
  }

  // 创建所有搜索词的正则表达式（不区分大小写）
  const regexPattern = searchTerms.map((term) => escapeRegExp(term)).join('|')

  const regex = new RegExp(`(${regexPattern})`, 'gi')
  const matches = [...fieldValue.matchAll(regex)]

  // 如果没有匹配，返回整个字段作为普通文本
  if (matches.length === 0) {
    return [{ type: 'text', value: fieldValue }]
  }

  let lastIndex = 0

  matches.forEach((match) => {
    const matchIndex = match.index!
    const matchValue = match[0]

    // 添加匹配前的普通文本
    if (matchIndex > lastIndex) {
      const beforeText = fieldValue.substring(lastIndex, matchIndex)
      if (beforeText) {
        texts.push({ type: 'text', value: beforeText })
      }
    }

    // 添加匹配的高亮文本
    texts.push({ type: 'hit', value: matchValue })

    lastIndex = matchIndex + matchValue.length
  })

  // 添加最后一个匹配后的普通文本
  if (lastIndex < fieldValue.length) {
    const afterText = fieldValue.substring(lastIndex)
    if (afterText) {
      texts.push({ type: 'text', value: afterText })
    }
  }

  return texts
}

// 转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 完善后的代码
function getHighlightsHTML(
  highlightsField: HighlightField[],
  fieldName: string
): string[] {
  const highlightedStrings = highlightsField
    .filter((h) => h.path === fieldName)
    .map((h) => {
      return h.texts
        .map((t) => {
          if (t.type === 'hit') {
            return "<strong style='color:#ffa21a'>" + t.value + '</strong>'
          } else {
            return t.value
          }
        })
        .join('')
    })
  return highlightedStrings
}

function createHighlighting(
  highlightsField: HighlightField[],
  fieldName: string,
  fieldValue: string
): HighlightResult {
  // 找到对应字段的高亮数据
  const fieldHighlight = highlightsField.find((h) => h.path === fieldName)

  if (!fieldHighlight || !fieldHighlight.texts) {
    return { __html: fieldValue }
  }

  // 从完整的 texts 中提取与 fieldValue 匹配的部分
  const fullText = fieldHighlight.texts.map((t) => t.value).join('')

  // 如果 fieldValue 是完整文本的一部分
  if (fullText.includes(fieldValue) && fieldValue !== fullText) {
    const startIndex = fullText.indexOf(fieldValue)
    const endIndex = startIndex + fieldValue.length

    // 遍历 texts，找到对应的片段
    let currentIndex = 0
    let result = ''

    for (const text of fieldHighlight.texts) {
      const textEndIndex = currentIndex + text.value.length

      // 如果当前片段与目标范围有交集
      if (currentIndex < endIndex && textEndIndex > startIndex) {
        const overlapStart = Math.max(0, startIndex - currentIndex)
        const overlapEnd = Math.min(text.value.length, endIndex - currentIndex)
        const overlapText = text.value.substring(overlapStart, overlapEnd)

        if (text.type === 'hit') {
          result += `<strong style='color:#ffa21a'>${overlapText}</strong>`
        } else {
          result += overlapText
        }
      }

      currentIndex = textEndIndex
      if (currentIndex >= endIndex) break
    }

    return { __html: result || fieldValue }
  }

  // 原有逻辑：fieldValue 是完整字符串
  const highlightedStrings = getHighlightsHTML(highlightsField, fieldName)
  const nonHighlightedStrings = highlightsField
    .filter((h) => h.path === fieldName)
    .map((h) => {
      return h.texts.map((t) => t.value).join('')
    })

  let result = fieldValue
  highlightedStrings.forEach((str, idx) => {
    if (nonHighlightedStrings[idx] === fieldValue) {
      result = str
    } else if (fieldValue.includes(nonHighlightedStrings[idx])) {
      result = fieldValue.replace(nonHighlightedStrings[idx], str)
    }
  })

  return { __html: result }
}

export default createHighlighting

// 导出类型供其他文件使用
export type { HighlightText, HighlightField, HighlightResult }

export {
  createHighlightsManually,
  createHighlighting,
  getHighlightsHTML,
  escapeRegExp,
  createFieldHighlights,
}
