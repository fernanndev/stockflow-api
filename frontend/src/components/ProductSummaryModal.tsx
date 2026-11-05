import { Link } from "react-router-dom";

import type { Product } from "../types";
import { formatDate } from "../utils/date";
import { formatCurrency } from "../utils/format";
import { getImageUrl } from "../utils/image";

import { ExpirationBadge } from "./ExpirationBadge";
import { Modal } from "./Modal";
import { ProfitValue } from "./ProfitValue";
import { StockBadge } from "./StockBadge";

interface ProductSummaryModalProps {
    product: Product
    onClose: () => void
    onOpenLots: () => void
    onEdit: () => void
}

function Field({ label, children }: {label: string; children: React.ReactNode}) {
    return (
        <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
            <dt className="mt-0.5 text-sm text-slate-900">{children}</dt>
        </div>
    )
}

export function ProductSummaryModal({
    product,
    onClose,
    onOpenLots,
    onEdit,
}: ProductSummaryModalProps) {
    const imageSrc = getImageUrl(product.image_url)

    return (
        <Modal open title={product.name} onClose={onClose} widthClass="max-w-lg">
            {imageSrc && (
                <img
                    src={imageSrc}
                    alt={product.name}
                    className="mb-4 max-h-64 w-full rounded bg-slate-50 object-contain"
                />
            )}

            <p className="text-sm text-slate-500">
                {product.category.name}
                {product.size ? ` . ${product.size}`: ""}
            </p>

            {product.description && (
                <p className="mt-2 text-sm text-slate-700">{product.description}</p>
            )}

            <dl className="mt-4 grid grid cols-2 gap-4 border-t border-slate-100 pt-4">
                <Field label="Preço">{formatCurrency(product.price)}</Field>
                <Field label="Custo">{product.cost_price !== null ? formatCurrency(product.cost_price): ""}</Field>
                <Field label="Lucro por unidade">
                    <ProfitValue value={product.unit_profit} />
                </Field>
                <Field label="Estoque">
                    {product.stock_quantity}
                    <span className="text-slate-400"> / mín. {product.minimum_stock}</span>
                    <StockBadge 
                        quantity={product.stock_quantity}
                        minimum={product.minimum_stock}
                    />
                </Field>
                <Field label="Validade mais próxima">
                    {product.expiration_date ? (
                        <>
                            {formatDate(product.expiration_date)}
                            <ExpirationBadge isoDate={product.expiration_date} />
                        </>
                    ): (
                        "—"
                    )}
                </Field>
            </dl>

            {product.variations.length > 1 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Variações</p>
                    <ul className="mt-1 space-y-1 text-sm text-slate-700"> 
                        {product.variations.map((variation) => (
                            <li key={variation.id} className="flex justify-between">
                                <span>{variation.name}</span>
                                <span className="font-medium">{variation.stock_quantity} un.</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3 text-sm font-medium">
                <button
                    type="button"
                    onClick={onOpenLots}
                    className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                    Lotes
                </button>
                <Link
                    to={`/stock-movements?product_id=${product.id}`}
                    className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                    Movimentações
                </Link>
                <button
                    type="button"
                    onClick={onEdit}
                    className="rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
                >  
                    Editar
                </button>
            </div>
        </Modal>
    )
}