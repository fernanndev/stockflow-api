import { api } from "./client"
import type { DashboardResponse, Product } from "../types"

export async function getDashboard(): Promise<DashboardResponse> {
    const response = await api.get<DashboardResponse>("/reports/dashboard")
    return response.data
}

export async function getLowStockProducts(): Promise<Product[]> {
    const response = await api.get<Product[]>("/reports/low_stock")
    return response.data
}

export async function getExpiringProducts(days = 30): Promise<Product[]> {
    const response = await api.get<Product[]>("/reports.expiring", {
        params: { days },
    })
    return response.data
}