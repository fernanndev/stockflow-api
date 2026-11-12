interface StockBadgeProps {
    quantity: number
    minimum: number
}

export function StockBadge({ quantity, minimum }: StockBadgeProps) {
    if (quantity === 0) {
        return (
            <span className="badge ml-2 bg-red-600 text-white">
                Sem estoque
            </span>
        )
    }

    if (quantity <= minimum) {
        return (
            <span className="badge ml-2 bg-red-50 text-red-700 ring-1 ring-red-600/15">
                Baixo
            </span>
        )
    }

    return null
}
