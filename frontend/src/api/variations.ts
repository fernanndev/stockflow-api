import { api } from "./client"
import type { Lot, Variation } from "../types"

export interface VariationInput {
    name: string
    // omitted = keep the current barcode; null clears it
    barcode?: string | null
}

export async function createVariation(
    productId: number,
    name: string,
    barcode: string | null = null,
): Promise<Variation> {
    const response = await api.post<Variation>(`/products/${productId}/variations`, {
        name,
        barcode,
    })

    return response.data
}

export async function updateVariation(id: number, data: VariationInput): Promise<Variation> {
    const response = await api.put<Variation>(`/variations/${id}`, data)
    return response.data
}

export async function deleteVariation(id: number): Promise<void> {
    await api.delete(`/variations/${id}`)
}

export async function updateLot(
    id: number,
    data: { expiration_date: string | null; quantity: number },
): Promise<Lot> {
    const response = await api.put<Lot>(`/lots/${id}`, data)
    return response.data
}