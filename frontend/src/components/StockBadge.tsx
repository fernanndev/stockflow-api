interface StockBadgeProps {
    quantity: number
    minimum: number
}

export function StockBadge({ quantity, minimum }: StockBadgeProps) {
    if (quantity === 0) {
        return (
            <span className="ml-2 rounded bg-red-600 px-2 py-5 py-0.5 text-sx font-medium text-white">
                Sem estoque
            </span>
        )
    }

    if (quantity <= minimum) {
        return (
            <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Baixo
            </span>
        )
    }

    return null
}