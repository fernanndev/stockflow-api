import { api } from "./client"
import type { Lot, Variation } from "../types"

export async function createVariation(productId: number, name: string): Promise<Variation> {
    const response = await api.post<Variation>(`/products/${productId}/variations`, { name })

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