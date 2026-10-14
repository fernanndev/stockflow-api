import { api } from "./client"
import type { StockMovement } from "../types"

export interface StockMovementCreateInput{
    product_id: number
    type: "in" | "out"
    quantity: number
}

export async function getStockMovements(productId?: number): Promise<StockMovement[]> {
    const response = await api.get<StockMovement[]>("/stock-movements/", {
        params: { product_id: productId },
    })
    return response.data
}

export async function createStockMovement(
    data: StockMovementCreateInput,
): Promise<StockMovement> {
    const response = await api.post<StockMovement>("/stock-movements/", data)
    return response.data
}
