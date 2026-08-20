import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue

    try {
      const stored = window.localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore storage errors, such as private mode or quota issues.
    }
  }, [key, value])

  return [value, setValue]
}
