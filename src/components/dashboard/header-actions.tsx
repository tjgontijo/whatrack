'use client'

import * as React from 'react'

type HeaderActionsContextType = {
    actions: React.ReactNode
    setActions: (actions: React.ReactNode) => void
}

const HeaderActionsContext = React.createContext<HeaderActionsContextType | null>(null)

export function HeaderActionsProvider({ children }: { children: React.ReactNode }) {
    const [actions, setActions] = React.useState<React.ReactNode>(null)

    return (
        <HeaderActionsContext.Provider value={{ actions, setActions }}>
            {children}
        </HeaderActionsContext.Provider>
    )
}

export function useHeaderActions() {
    const context = React.useContext(HeaderActionsContext)
    if (!context) {
        throw new Error('useHeaderActions must be used within HeaderActionsProvider')
    }
    return context
}

// Component to set header actions from any page
export function HeaderActions({ children }: { children: React.ReactNode }) {
    const { setActions } = useHeaderActions()

    React.useEffect(() => {
        setActions(children)
        return () => setActions(null)
    }, [children, setActions])

    return null
}

// Component to render header actions (used in header)
export function HeaderActionsSlot() {
    const { actions } = useHeaderActions()
    return <>{actions}</>
}
