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