import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { getStore } from "../api/store"
import type { StoreSettings } from "../types"
import { applyTheme, cacheStore, readCachedStore } from "../utils/theme"
import { StoreContext } from "./storeContext"

export function StoreProvider({ children }: { children: ReactNode }) {
    const [store, setStoreState] = useState<StoreSettings>(readCachedStore)

    const setStore = useCallback((next: StoreSettings) => {
        setStoreState(next)
        cacheStore(next)
    }, [])

    // public endpoint: works before login, so the login screen is already branded
    useEffect(() => {
        getStore()
            .then(setStore)
            .catch(() => {
                // offline or API down: keep the last known look
            })
    }, [setStore])

    useEffect(() => {
        applyTheme(store)
        document.title = `${store.name} | StockFlow`
    }, [store])

    const value = useMemo(() => ({ store, setStore }), [store, setStore])

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
