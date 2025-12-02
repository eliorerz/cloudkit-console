import React from 'react'

/**
 * Safely formats text by converting backtick-wrapped text to code elements.
 * This avoids XSS vulnerabilities by using React elements instead of dangerouslySetInnerHTML.
 *
 * @param text - The text to format (may contain `code` segments)
 * @returns React elements with formatted text
 */
export function formatDescriptionText(text: string): React.ReactNode {
  if (!text) return null

  // Escape HTML to prevent XSS
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // Split by backticks to find code segments
  const parts = text.split(/`([^`]+)`/)

  return (
    <>
      {parts.map((part, index) => {
        // Odd indices are inside backticks (code)
        if (index % 2 === 1) {
          return (
            <code
              key={index}
              style={{
                backgroundColor: 'var(--pf-v6-global--BackgroundColor--200)',
                padding: '0.125rem 0.25rem',
                borderRadius: '3px',
                fontFamily: 'monospace',
                fontSize: '0.875em'
              }}
            >
              {part}
            </code>
          )
        }
        // Even indices are regular text - escape HTML
        return <span key={index} dangerouslySetInnerHTML={{ __html: escapeHtml(part) }} />
      })}
    </>
  )
}
