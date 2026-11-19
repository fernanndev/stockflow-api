import type { Product } from "../types"
import { isStalled, idleDays } from "../utils/products"

// orange tag for products with stock that are not selling: a hint to run a promotion
export function StalledBadge({ product }: { product: Product }) {
    if (!isStalled(product)) return null

    const days = idleDays(product)

    return (
        <span
            className="badge bg-amber-100 text-amber-800"
            title={
                product.last_sold_at
                    ? `Última venda há ${days} dias`
                    : `Nunca vendeu, cadastrado há ${days} dias`
            }
        >
            Parado há {days} dias
        </span>
    )
}
