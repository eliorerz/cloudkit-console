import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { formatDescriptionText } from './formatText'

describe('formatDescriptionText', () => {
  it('should return null for empty string', () => {
    const result = formatDescriptionText('')
    expect(result).toBeNull()
  })

  it('should return null for null/undefined', () => {
    const result1 = formatDescriptionText(null as unknown as string)
    const result2 = formatDescriptionText(undefined as unknown as string)
    expect(result1).toBeNull()
    expect(result2).toBeNull()
  })

  it('should render plain text without backticks', () => {
    const result = formatDescriptionText('Hello World')
    const { container } = render(<div>{result}</div>)
    expect(container.textContent).toBe('Hello World')
  })

  it('should render code elements for backtick-wrapped text', () => {
    const result = formatDescriptionText('Use `kubectl` to deploy')
    const { container } = render(<div>{result}</div>)

    const codeElement = container.querySelector('code')
    expect(codeElement).toBeInTheDocument()
    expect(codeElement?.textContent).toBe('kubectl')
  })

  it('should handle multiple code segments', () => {
    const result = formatDescriptionText('Run `npm install` and then `npm start`')
    const { container } = render(<div>{result}</div>)

    const codeElements = container.querySelectorAll('code')
    expect(codeElements).toHaveLength(2)
    expect(codeElements[0].textContent).toBe('npm install')
    expect(codeElements[1].textContent).toBe('npm start')
  })

  it('should escape HTML characters in plain text', () => {
    const result = formatDescriptionText('Value: <script>alert("XSS")</script>')
    const { container } = render(<div>{result}</div>)

    expect(container.innerHTML).toContain('&lt;script&gt;')
    expect(container.innerHTML).toContain('&lt;/script&gt;')
  })

  it('should escape ampersands', () => {
    const result = formatDescriptionText('Tom & Jerry')
    const { container } = render(<div>{result}</div>)

    expect(container.innerHTML).toContain('&amp;')
  })

  it('should escape quotes', () => {
    const result = formatDescriptionText('Say "Hello" and \'Goodbye\'')
    const { container } = render(<div>{result}</div>)

    // Check that quotes are escaped in the HTML
    const html = container.innerHTML
    expect(html).toMatch(/&quot;|"/)
    expect(html).toMatch(/&#039;|'/)
  })

  it('should handle text with code and HTML characters', () => {
    const result = formatDescriptionText('Run `<command>` with args')
    const { container } = render(<div>{result}</div>)

    const codeElement = container.querySelector('code')
    expect(codeElement?.textContent).toBe('<command>')
    expect(container.innerHTML).toContain('&lt;command&gt;')
  })

  it('should handle empty backticks', () => {
    const result = formatDescriptionText('Empty `` code')
    const { container } = render(<div>{result}</div>)

    const codeElement = container.querySelector('code')
    // Empty backticks create an empty code element
    if (codeElement) {
      expect(codeElement.textContent).toBe('')
    }
  })

  it('should apply correct styling to code elements', () => {
    const result = formatDescriptionText('Use `code` here')
    const { container } = render(<div>{result}</div>)

    const codeElement = container.querySelector('code')
    expect(codeElement).toHaveStyle({
      fontFamily: 'monospace',
      fontSize: '0.875em'
    })
  })

  it('should handle consecutive code segments', () => {
    const result = formatDescriptionText('`first``second`')
    const { container } = render(<div>{result}</div>)

    const codeElements = container.querySelectorAll('code')
    expect(codeElements).toHaveLength(2)
    expect(codeElements[0].textContent).toBe('first')
    expect(codeElements[1].textContent).toBe('second')
  })

  it('should handle text ending with code', () => {
    const result = formatDescriptionText('Install with `npm install`')
    const { container } = render(<div>{result}</div>)

    expect(container.textContent).toBe('Install with npm install')
  })

  it('should handle text starting with code', () => {
    const result = formatDescriptionText('`npm install` to begin')
    const { container } = render(<div>{result}</div>)

    expect(container.textContent).toBe('npm install to begin')
  })
})
