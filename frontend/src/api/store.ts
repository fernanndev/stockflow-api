import { api } from "./client"
import type { StoreSettings } from "../types"

export async function getStore(): Promise<StoreSettings> {
    const response = await api.get<StoreSettings>("/store/")
    return response.data
}

export async function updateStore(
    data: Omit<StoreSettings, "logo_url">,
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
