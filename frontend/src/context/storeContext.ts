import { createContext, useContext } from "react"
import type { StoreSettings } from "../types"

export interface StoreContextType {
    store: StoreSettings
    setStore: (store: StoreSettings) => void
}

export const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function useStore() {
    const context = useContext(StoreContext)

    if (!context) {
        throw new Error("useStore must be used within a StoreProvider")
    }

    return context
}
