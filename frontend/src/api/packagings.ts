import { api } from "./client"
import type { Packaging } from "../types"

export interface PackagingCreateInput {
    name: string
    quantity?: number | null
    total_cost?: number | null
}

export interface PackagingUpdateInput {
    name: string
    stock_quantity?: number
    unit_cost?: number
}

export interface PackagingPurchaseInput {
    quantity: number
    total_cost: number
}

export async function getPackagings(): Promise<Packaging[]> {
    const response = await api.get<Packaging[]>("/packagings/")
    return response.data
}

export async function createPackaging(data: PackagingCreateInput): Promise<Packaging> {
    const response = await api.post<Packaging>("/packagings/", data)
    return response.data
}

export async function updatePackaging(
    id: number,
    data: PackagingUpdateInput,
): Promise<Packaging> {
    const response = await api.put<Packaging>(`/packagings/${id}`, data)
    return response.data
}

export async function registerPackagingPurchase(
    id: number,
    data: PackagingPurchaseInput,
): Promise<Packaging> {
    const response = await api.post<Packaging>(`/packagings/${id}/purchases`, data)
    return response.data
}

export async function deletePackaging(id: number): Promise<void> {
    await api.delete(`/packagings/${id}`)
}

export async function uploadPackagingImage(id: number, file:File): Promise<Packaging> {
    const formData = new FormData()
    formData.append("image", file)

    const response = await api.post<Packaging>(`/packagings/${id}/image`, formData)
    return response.data
}

export async function deletePackagingImage(id: number): Promise<Packaging> {
    const response = await api.delete<Packaging>(`/packagings/${id}/image`)
    return response.data 
}
