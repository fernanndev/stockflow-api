import { Link } from "react-router-dom"

import type { Product } from "../types"
import { formatDate } from "../utils/date"
import { formatCurrency } from "../utils/format"
import { getImageUrl } from "../utils/image"

import { ExpirationBadge } from "./ExpirationBadge"
import { Modal } from "./Modal"
import { ProfitValue } from "./ProfitValue"
import { StockBadge } from "./StockBadge"

interface ProductSummaryModalProps {
    product: Product
    onClose: () => void
    onOpenLots: () => void
    onEdit: () => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
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
                    className="mb-4 max-h-64 w-full rounded-lg bg-slate-50 object-contain"
                />
            )}

            <p className="text-sm text-slate-500">
                {product.category.name}
                {product.size ? ` · ${product.size}` : ""}
            </p>

            {product.description && (
                <p className="mt-2 text-sm text-slate-700">{product.description}</p>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <Field label="Preço">{formatCurrency(product.price)}</Field>
                <Field label="Custo">
                    {product.cost_price !== null ? formatCurrency(product.cost_price) : "—"}
                </Field>
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
                    ) : (
                        "—"
                    )}
                </Field>
                {product.variations.length === 1 && (
                    <Field label="Código de barras">
                        {product.variations[0].barcode ?? "—"}
                    </Field>
                )}
            </dl>

            {product.variations.length > 1 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Variações</p>
                    <ul className="mt-1 space-y-1 text-sm text-slate-700">
                        {product.variations.map((variation) => (
                            <li key={variation.id} className="flex justify-between">
                                <span>
                                    {variation.name}
                                    {variation.barcode && (
                                        <span className="ml-2 font-mono text-xs text-slate-400">
                                            {variation.barcode}
                                        </span>
                                    )}
                                </span>
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
                    className="btn btn-secondary"
                >
                    Lotes
                </button>
                <Link
                    to={`/stock-movements?product_id=${product.id}`}
                    className="btn btn-secondary"
                >
                    Movimentações
                </Link>
                <button
                    type="button"
                    onClick={onEdit}
                    className="btn btn-primary"
                >
                    Editar
                </button>
            </div>
        </Modal>
    )
}