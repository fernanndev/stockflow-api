import type { Product } from "../types";
import { formatCurrency } from "../utils/format";
import { getImageUrl } from "../utils/image";

interface SaleProductCardProps {
    product: Product
    // units of each variation already in the sale (variation id -> quantity)
    inSale: Map<number, number>
    onAdd: (product: Product, variation_id: number) => void
}

function stockBadge(product: Product): { label: string; className: string } {
    const stock = product.stock_quantity

    if (stock <= 0) {
        return { label: "Sem estoque", className: "bg-red-100 text-red-700" }
    }

    if (stock <= product.minimum_stock) {
        return { label: `Últimas ${stock}`, className: "bg-amber-100 text-amber-800" }
    }

    return { label: `${stock} em estoque`, className: "bg-white/90 text-slate-700" }
}

export function SaleProductCard ({ product, inSale, onAdd }: SaleProductCardProps) {
    const src = getImageUrl(product.image_url)
    const badge = stockBadge(product)
    const outOfStock = product.stock_quantity <= 0

    const totalInSale = product.variations.reduce(
        (sum, variation) => sum + (inSale.get(variation.id) ?? 0),
        0,

    )
    // what is still free to add: stock minus what is already in the sale
    function available(variationId: number, stock: number): number {
        return stock - (inSale.get(variationId) ?? 0)
    }

    const hasSeveralVariations = product.variations.length > 1
    const only = product.variations[0]
    const onlyAvailable = available(only.id, only.stock_quantity)

    return (
        <article className="card flex h-full w-full flex-col overflow-hidden">
            <div className="relative aspect-[4/3] bg-slate-100">
                {src ? (
                    <img
                        src={src}
                        alt={product.name}
                        className={`h-full w-full object-cover ${outOfStock ? "opacity-60" : ""}`}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-brand-50 text-4xl font-semibold text-brand-700">
                        {product.name.charAt(0).toUpperCase()}
                    </div>
                )}

                <span
                    className={`absolute top-2 left-2 rounded-md px-2 py-0.5 text-[11px] font-medium shadow-xs ${badge.className}`}
                >
                    {badge.label}
                </span>

                {totalInSale > 0 && (
                    <span className="absolute top-2 right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-700 px-1.5 text-xs font-semibold text-white shadow-xs">
                        {totalInSale}
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col p-3">
                <p className="truncate text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                    {product.category.name}
                </p>
                <h3 className="mt-0.5 line-clamp-2 min-h-10 text-sm font-medium text-slate-900">
                    {product.name}
                </h3>
                <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">
                    {formatCurrency(product.price)}
                </p>

                <div className="mt-auto pt-3">
                    {hasSeveralVariations ? (
                        <div className="grid grid-cols-3 gap-1.5">
                            {product.variations.map((variation) => {
                                const free = available(variation.id, variation.stock_quantity)

                                return (
                                    <button
                                        key={variation.id}
                                        type="button"
                                        disabled={free <= 0}
                                        onClick={() => onAdd(product, variation.id)}
                                        className="rounded-lg border border-slate-300 px-1 py-1.5 text-center leading-tight transition hover:border-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-transparent disabled:text-slate-400"
                                    >
                                        <span className="block truncate text-sm font-medium">
                                            {variation.name}
                                        </span>
                                        <span className="block text-[11px] text-slate-500">
                                            {Math.max(free, 0)} un
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    ) : onlyAvailable > 0 ? (
                        <button
                            type="button"
                            onClick={() => onAdd(product, only.id)}
                            className="btn btn-primary btn-sm w-full"
                        >
                            + Adicionar
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="btn btn-secondary btn-sm w-full"
                        >
                            {outOfStock ? "Indisponível" : "Tudo na venda"}
                        </button>
                    )}
                </div>
            </div>
        </article>
    )
}