const KEY = "active_store_id"

// The store the user is working in, remembered on this device. The API client sends it
// in the X-Store-Id header, so every request is answered for that store.
export function readActiveStoreId(): number | null {
    try {
        const value = Number(localStorage.getItem(KEY))

        return Number.isInteger(value) && value > 0 ? value : null
    } catch {
        return null
    }
}

export function saveActiveStoreId(id: number) {
    try {
        localStorage.setItem(KEY, String(id))
    } catch {
        // storage blocked: the first store is used on the next visit
    }
}
