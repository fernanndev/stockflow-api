export interface User {
    id: number
    name: string
    email: string
}

export interface Category {
    id: number
    name: string
}

export interface Lot {
    id: number
    quantity: number
    expiration_date: string | null
}

export interface Variation {
    id: number
    name: string
    stock_quantity: number
    lots: Lot[]
}

export interface Product {
    id: number
    name: string
    description: string | null
    price: number
    cost_price: number | null
    unit_profit: number | null
    stock_quantity: number
    minimum_stock: number
    size: string | null
    expiration_date: string | null
    image_url: string | null
    category: Category
    variations: Variation[]
}

export interface Packaging {
    id: number
    name: string
    stock_quantity: number
    unit_cost: number
    image_url: string | null
}

export type MovementReason =
    | "sale"
    | "gift"
    | "expired"
    | "loss"
    | "other"
    | "sale_canceled"


export interface StockMovement { 
    id: number
    product_id: number
    variation_id: number
    type: "in" | "out"
    quantity: number
    reason: MovementReason | null
    sale_id: number | null
    created_at: string
    product: Product
}

export interface AuthToken {
    access_token: string
    token_type: string
}

export interface DashboardResponse {
    total_products: number
    total_categories: number
    total_stock_value: number
    projected_profit: number
    low_stock_count: number
    expiring_count: number
}

export type PaymentMethod = "pix" | "cash" | "credit_card" | "debit_card" | "other"

export type SaleStatus = "completed" | "canceled"

export interface SaleItem {
    id: number
    product_id: number | null
    variation_id: number | null
    product_name: string
    variation_name: string
    quantity: number
    unit_price: number
    unit_cost: number | null
    is_gift: boolean
}

export interface SalePackaging {
    id: number
    packaging_id: number | null
    packaging_name: string
    quantity: number
    unit_cost: number
}

export interface SalePayment {
    id: number
    amount: number
    method: PaymentMethod
    created_at: string
}

export interface Sale {
    id: number
    created_at: string
    customer_name: string | null
    customer_phone: string | null
    status: SaleStatus
    canceled_at: string | null
    items: SaleItem[]
    packagings: SalePackaging[]
    payments: SalePayment[]
    total: number
    paid_amount: number
    balance: number
}

export interface SaleList {
    sales: Sale[]
    total_sold: number
    total_paid: number
    total_open: number
}