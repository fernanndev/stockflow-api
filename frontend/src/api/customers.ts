import { api } from "./client";
import type { Customer, CustomerDetail } from "../types";

export interface CustomerInput {
    name: string
    phone: string | null
    notes: string | null
}

export async function getCustomers(): Promise<Customer[]> {
    const response = await api.get<Customer[]>("/customers/")
    return response.data
}

export async function getCustomer(id: number): Promise<CustomerDetail> {
    const response = await api.get<CustomerDetail>(`/customers/${id}`)
    return response.data
}

export async function createCustomer(data: CustomerInput): Promise<Customer> {
    const response = await api.post<Customer>("/customers/", data)
    return response.data
}

export async function updateCustomer(id: number, data: CustomerInput): Promise<CustomerDetail> {
    const response = await api.put<CustomerDetail>(`/customers/${id}`, data)
    return response.data
}

export async function deleteCustomer(id: number): Promise<void> {
    await api.delete(`/customers/${id}`)
}