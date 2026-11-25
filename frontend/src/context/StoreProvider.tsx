import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { createStore as createStoreRequest, getStore, getStorePlan, getStores } from "../api/store"
import type { StorePlan, StoreSettings } from "../types"
import { readActiveStoreId, saveActiveStoreId } from "../utils/activeStore"
import { applyTheme, cacheStore, readCachedStore } from "../utils/theme"
import { useAuth } from "./AuthContext"
import { StoreContext } from "./storeContext"

// one shared empty list, so the context value does not change on every render
const NO_STORES: StoreSettings[] = []

export function StoreProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth()
    const [store, setStoreState] = useState<StoreSettings>(readCachedStore)
    const [allStores, setAllStores] = useState<StoreSettings[]>([])
    const [plan, setPlan] = useState<StorePlan | null>(null)

    // makes a store the active one: remembered for the API client and for the next visit
    const adopt = useCallback((next: StoreSettings) => {
        saveActiveStoreId(next.id)
        cacheStore(next)
        setStoreState(next)
    }, [])

    // public endpoint: works before login, so the login screen already has the store look
    useEffect(() => {
        getStore()
            .then(adopt)
            .catch(() => {
                // offline or API down: keep the last known look
            })
    }, [adopt])

    // after the login: every store of the installation and the plan
    useEffect(() => {
        if (!isAuthenticated) return

        let cancelled = false

        Promise.all([getStores(), getStorePlan()])
            .then(([list, currentPlan]) => {
                if (cancelled) return

                setAllStores(list)
                setPlan(currentPlan)

                const active = list.find((item) => item.id === readActiveStoreId()) ?? list[0]

                if (active) adopt(active)
            })
            .catch(() => {
                // the header keeps working with the store already known
            })

        return () => {
            cancelled = true
        }
    }, [isAuthenticated, adopt])

    useEffect(() => {
        applyTheme(store)
        document.title = `${store.name} | StockFlow`
    }, [store])

    const setStore = useCallback(
        (updated: StoreSettings) => {
            adopt(updated)
            setAllStores((current) =>
                current.map((item) => (item.id === updated.id ? updated : item)),
            )
        },
        [adopt],
    )

    const switchStore = useCallback(
        (id: number) => {
            const next = allStores.find((item) => item.id === id)

            if (next) adopt(next)
        },
        [allStores, adopt],
    )

    const createStore = useCallback(
        async (name: string) => {
            const created = await createStoreRequest(name)

            setAllStores((current) => [...current, created])
            setPlan((current) =>
                current ? { ...current, total_stores: current.total_stores + 1 } : current,
            )
            adopt(created)

            return created
        },
        [adopt],
    )

    const stores = isAuthenticated ? allStores : NO_STORES

    const value = useMemo(
        () => ({ store, stores, plan, setStore, switchStore, createStore }),
        [store, stores, plan, setStore, switchStore, createStore],
    )

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
