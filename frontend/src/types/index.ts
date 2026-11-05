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

export interface StockMovement { 
    id: number
    product_id: number
    type: "in" | "out"
    quantity: number
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