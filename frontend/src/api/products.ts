import { api } from "./client"
import type { Product } from "../types"

export interface ProductCreateInput{
    name: string
    description?: string | null
    price: number
    stock_quantity: number
    minimum_stock: number
    size?: string | null
    expiration_date?: string | null
    category_id: number
}

export interface ProductUpdateInput {
    name: string
    description?: string | null
    price: number
    minimum_stock: number
    size?: string | null
    expiration_date?: string | null
    category_id: number
}

export async function getProducts(): Promise<Product[]> {
    const response = await api.get<Product[]>("/products/")
    return response.data
}

export async function createProduct(data: ProductCreateInput): Promise<Product> {
    const response = await api.post<Product>("/products/", data)
    return response.data
}

export async function uploadProductImage(id: number, file: File): Promise<Product> {
    const formData = new FormData()
    formData.append("image", file)

    const response = await api.post<Product>(`/products/${id}/image`, formData)
    return response.data
}

export async function updateProduct(id: number, data: ProductUpdateInput): Promise<Product> {
    const response = await api.put<Product>(`/products/${id}`, data)
    return response.data
}

export async function deleteProduct(id: number): Promise<void> {
    await api.delete(`/products/${id}`)
}

export async function deleteProductImage(id: number): Promise<Product> {
    const response = await api.delete<Product>(`/products/${id}/image`)
    return response.data
}