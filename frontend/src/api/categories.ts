import { api } from "./client"
import type { Category } from "../types"

export async function getCategories(): Promise<Category[]> {
    const response = await api.get<Category[]>("/categories/")
    return response.data
}

export async function createCategory(name: string): Promise<Category> { 
    const response = await api.post<Category>("/categories/", { name })
    return response.data
}

export async function updateCategory(id: number, name: string): Promise<Category> {
    const response = await api.put<Category>(`/categories/${id}`, { name })
    return response.data
}

export async function deleteCategory(id: number): Promise<void> {
    await api.delete(`/categories/${id}`)
}