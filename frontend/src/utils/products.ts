import type { Product } from "../types"
import { daysSince } from "./date"

// a product with stock that did not sell for this many days is "parado"
export const STALLED_DAYS = 30

// days without selling: counted from the last sale, or from the registration if it never sold
export function idleDays(product: Product): number {
    return daysSince(product.last_sold_at ?? product.created_at)
}

// only products that still have stock can be "parados" (nothing to discount otherwise)
export function isStalled(product: Product, minDays = STALLED_DAYS): boolean {
    return product.stock_quantity > 0 && idleDays(product) >= minDays
}
