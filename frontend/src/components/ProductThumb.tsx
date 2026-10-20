import type { Product } from "../types";
import { getImageUrl } from "../utils/image";

interface ProductThumbProps {
    product: Product
    onClick?: () => void
}

export function ProductThumb({ product, onClick }: ProductThumbProps) {
    const src = getImageUrl(product.image_url)

    if (!src) {
        return (
            <div className="flex h-10 w-10 shrink-9 items-center justify-center rounded bg-slate-100 text-sm font-medium text-slate-400">
                {product.name.charAt(0).toUpperCase()}
            </div>
        )
    }

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Ver foto de ${product.name}`}
            className="h-10 w-10 shrink-0 overflow-hidden rounded border border-slate-200"
        >
            <img src={src} alt={product.name} className="h-full object-cover" />
        </button>
    )
}