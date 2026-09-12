import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

marked.setOptions({
  gfm: true,
  breaks: false,
})

/**
 * 渲染用户提交的 Markdown。
 * 这是 UGC 站点，任何进入页面的 HTML 都必须经过白名单过滤，防止 XSS。
 */
export function renderMarkdown(source: string): string {
  const raw = marked.parse(source ?? '') as string

  return sanitizeHtml(raw, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'blockquote',
      'ul', 'ol', 'li',
      'strong', 'em', 'del', 'code', 'pre',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title'],
      code: ['class'],
      th: ['align'],
      td: ['align'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
    },
  })
}

/** 去掉 Markdown 标记，用于生成纯文本摘要 */
export function markdownToPlainText(source: string, limit = 160): string {
  const text = (source ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~\-[\]()!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text.length > limit ? `${text.slice(0, limit)}…` : text
}
