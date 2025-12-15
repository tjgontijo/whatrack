'use client'

import { useEffect, useCallback } from 'react'

export type KeyboardShortcut = {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  action: () => void
  preventDefault?: boolean
  enabled?: boolean
}

type UseKeyboardShortcutsOptions = {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

/**
 * Hook global para gerenciar atalhos de teclado
 * 
 * @example
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: 'Enter', action: () => handleNext() },
 *     { key: 's', ctrl: true, action: () => handleSave(), preventDefault: true },
 *     { key: 'Escape', action: () => handleClose() },
 *   ]
 * })
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Ignora se estiver em um textarea ou contenteditable
      const target = event.target as HTMLElement
      if (target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue

        const keyMatch = event.key === shortcut.key || event.code === shortcut.key
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatch = shortcut.alt ? event.altKey : !event.altKey

        // Para atalhos com ctrl/meta, aceita ambos (Windows/Mac)
        const modifierMatch = shortcut.ctrl 
          ? (event.ctrlKey || event.metaKey) && shiftMatch && altMatch
          : ctrlMatch && shiftMatch && altMatch

        if (keyMatch && modifierMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.action()
          return
        }
      }
    },
    [shortcuts, enabled]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}

/**
 * Atalhos comuns pré-definidos
 */
export const COMMON_SHORTCUTS = {
  SAVE: { key: 's', ctrl: true },
  CLOSE: { key: 'Escape' },
  NEXT: { key: 'Enter' },
  BACK: { key: 'Backspace' },
  SEARCH: { key: 'k', ctrl: true },
} as const
