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

export async function updateProduct(id: number, data: ProductUpdateInput):
Promise<Product> {
    const response = await api.put<Product>(`/products/${id}`, data)
    return response.data
}

export async function deleteProduct(id: number): Promise<void> {
    await api.delete(`/product/${id}`)
}