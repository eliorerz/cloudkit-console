import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeProvider, ThemeContext } from './ThemeContext'
import { useContext } from 'react'

// Test component that uses the theme context
function TestComponent() {
  const context = useContext(ThemeContext)

  if (!context) {
    return <div>No context</div>
  }

  return (
    <div>
      <div data-testid="theme">{context.theme}</div>
      <div data-testid="effective-theme">{context.effectiveTheme}</div>
      <button onClick={() => context.setTheme('dark')}>Set Dark</button>
      <button onClick={() => context.setTheme('light')}>Set Light</button>
      <button onClick={() => context.setTheme('system')}>Set System</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('should provide default light theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(screen.getByTestId('effective-theme').textContent).toBe('light')
  })

  it('should load theme from localStorage', () => {
    localStorage.setItem('theme', 'Dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme').textContent).toBe('dark')
  })

  it('should map old localStorage values to new values', () => {
    localStorage.setItem('theme', 'System default')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme').textContent).toBe('system')
  })

  it('should change theme when setTheme is called', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme').textContent).toBe('light')

    const darkButton = screen.getByText('Set Dark')
    darkButton.click()

    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('dark')
    })
  })

  it('should save theme to localStorage with old format', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const darkButton = screen.getByText('Set Dark')
    darkButton.click()

    await waitFor(() => {
      expect(localStorage.getItem('theme')).toBe('Dark')
    })
  })

  it('should apply dark theme class to document root', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const darkButton = screen.getByText('Set Dark')
    darkButton.click()

    await waitFor(() => {
      expect(document.documentElement.classList.contains('pf-v6-theme-dark')).toBe(true)
    })
  })

  it('should remove dark theme class when switching to light', async () => {
    localStorage.setItem('theme', 'Dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(document.documentElement.classList.contains('pf-v6-theme-dark')).toBe(true)
    })

    const lightButton = screen.getByText('Set Light')
    lightButton.click()

    await waitFor(() => {
      expect(document.documentElement.classList.contains('pf-v6-theme-dark')).toBe(false)
    })
  })

  it('should detect system theme preference', () => {
    // Mock matchMedia to return dark preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    localStorage.setItem('theme', 'System default')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme').textContent).toBe('system')
    expect(screen.getByTestId('effective-theme').textContent).toBe('dark')
  })

  it('should use light theme when system preference is light', () => {
    // Mock matchMedia to return light preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    localStorage.setItem('theme', 'System default')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('effective-theme').textContent).toBe('light')
  })
})
