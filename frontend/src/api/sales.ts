import { api } from "./client";
import type { PaymentMethod, Sale, SaleList, SaleStatus } from "../types";

export interface SaleFilters {
    start_date?: string
    end_date?: string
    status?: SaleStatus
}

export interface SalePaymentInput {
    amount: number
    method: PaymentMethod
}

export async function getSales(filters: SaleFilters = {}): Promise<SaleList> {
    const response = await api.get<SaleList>("/sales/", { params: filters })
    return response.data
}

export async function addSalePayment(id: number, data: SalePaymentInput): Promise<Sale> {
    const response = await api.post<Sale>(`/sales/${id}/payments`, data)
    return response.data
}

export async function cancelSale(id: number): Promise<Sale> {
    const response = await api.post<Sale>(`/sales/${id}/cancel`)
    return response.data
}

export interface SaleCreateInput {
    customer_name?: string | null
    customer_phone?: string | null
    items: {
        product_id: number
        variation_id: number
        quantity: number
        unit_price: number
        is_gift: boolean
    }[]
    packagings: { packaging_id: number; quantity: number }[]
    payments: SalePaymentInput[]
}

export async function createSale(data: SaleCreateInput): Promise<Sale> {
    const response = await api.post<Sale>("/sales/", data)
    return response.data
}