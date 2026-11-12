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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">
                {product.name.charAt(0).toUpperCase()}
            </div>
        )
    }

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Ver foto de ${product.name}`}
            className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200"
        >
            <img src={src} alt={product.name} className="h-full w-full object-cover" />
        </button>
    )
}