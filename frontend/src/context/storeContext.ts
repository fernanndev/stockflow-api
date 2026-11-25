import { createContext, useContext } from "react"
import type { StorePlan, StoreSettings } from "../types"

export interface StoreContextType {
    // the store the user is working in
    store: StoreSettings
    // every store of the installation (empty before the login)
    stores: StoreSettings[]
    plan: StorePlan | null
    // after editing the active store (name, colors, logo)
    setStore: (store: StoreSettings) => void
    switchStore: (id: number) => void
    // creates a store and makes it the active one
    createStore: (name: string) => Promise<StoreSettings>
}

export const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function useStore() {
    const context = useContext(StoreContext)

    if (!context) {
        throw new Error("useStore must be used within a StoreProvider")
    }

    return context
}
