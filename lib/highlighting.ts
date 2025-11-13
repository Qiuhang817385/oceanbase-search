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
