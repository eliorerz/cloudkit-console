import React, { createContext, useEffect, useState, ReactNode } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeContextType {
  theme: ThemeMode
  effectiveTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
}

// Context must be exported from the same file as the Provider for React Context pattern
/* eslint-disable react-refresh/only-export-components */
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme')
    // Map old values to new values
    if (saved === 'System default') return 'system'
    if (saved === 'Light') return 'light'
    if (saved === 'Dark') return 'dark'
    return (saved as ThemeMode) || 'light'
  })

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  // Detect system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Calculate effective theme
  const effectiveTheme: 'light' | 'dark' =
    theme === 'system' ? systemTheme : theme

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement

    if (effectiveTheme === 'dark') {
      root.classList.add('pf-v6-theme-dark')
    } else {
      root.classList.remove('pf-v6-theme-dark')
    }
  }, [effectiveTheme])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    // Save using old format for compatibility with Settings page
    const saveValue =
      newTheme === 'system' ? 'System default' :
      newTheme === 'light' ? 'Light' :
      'Dark'
    localStorage.setItem('theme', saveValue)
  }

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
