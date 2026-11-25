import { api } from "./client"
import type { StorePlan, StoreSettings } from "../types"

// the store the user is working in (the header says which one); public, for the login screen
export async function getStore(): Promise<StoreSettings> {
    const response = await api.get<StoreSettings>("/store/")
    return response.data
}

export async function updateStore(
    data: Omit<StoreSettings, "id" | "logo_url">,
): Promise<StoreSettings> {
    const response = await api.put<StoreSettings>("/store/", data)
    return response.data
}

export async function uploadStoreLogo(file: File): Promise<StoreSettings> {
    const formData = new FormData()
    formData.append("image", file)

    const response = await api.post<StoreSettings>("/store/logo", formData)
    return response.data
}

export async function deleteStoreLogo(): Promise<StoreSettings> {
    const response = await api.delete<StoreSettings>("/store/logo")
    return response.data
}

export async function getStores(): Promise<StoreSettings[]> {
    const response = await api.get<StoreSettings[]>("/stores/")
    return response.data
}

export async function getStorePlan(): Promise<StorePlan> {
    const response = await api.get<StorePlan>("/stores/plan")
    return response.data
}

export async function createStore(name: string): Promise<StoreSettings> {
    const response = await api.post<StoreSettings>("/stores/", { name })
    return response.data
}
