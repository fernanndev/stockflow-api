import { Link } from "react-router-dom"

import type { StockMovement } from "../types"
import { getImageUrl } from "../utils/image"
import { REASON_LABELS } from "../utils/movements"

import { Modal } from "./Modal"

interface MovementSummaryModalProps {
    movement: StockMovement
    onClose: () => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
        </div>
    )
}

export function MovementSummaryModal({ movement, onClose }: MovementSummaryModalProps) {
    const { product } = movement
    const imageSrc = getImageUrl(product.image_url)
    const variation = product.variations.find((item) => item.id === movement.variation_id)
    const isEntry = movement.type === "in"

    return (
        <Modal open title="Resumo de movimentação" onClose={onClose} widthClass="max-w-lg">
            <div className="flex items-center gap-4">
                {imageSrc && (
                    <img
                        src={imageSrc}
                        alt={product.name}
                        className="h-20 w-20 shrink-0 rounded border border-slate-200 object-cover"
                    />
                )}
                <div className="min-w-0">
                    <p className="font-medium text-slate-900">{product.name}</p>
                    <p>
                        {product.category.name}
                        {product.size ? ` · ${product.size}` : ""}
                    </p>
                </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <Field label="Tipo">
                    <span className={
                            isEntry
                                ? "rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                                : "rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                        }
                    >
                        {isEntry ? "Entrada" : "Saída"}
                    </span>
                </Field>
                {movement.reason && (
                    <Field label="Motivo">{REASON_LABELS[movement.reason]}</Field>
                )}
                <Field label="Quantidade">
                    <span className={isEntry ? "text-emerald-700" : "text-red-700"}>
                        {isEntry ? "+" : "-"}
                        {movement.quantity} un.
                    </span>
                </Field>
                <Field label="Data e hora">
                    {new Date(movement.created_at).toLocaleString("pt-BR", {
                        dateStyle: "long",
                        timeStyle: "short",
                    })}
                </Field>
                {variation && product.variations.length > 1 && (
                    <Field label="Variação">{variation.name}</Field>
                )}
                <Field label="Estoque atual do produto">{product.stock_quantity} un.</Field>
                {variation && product.variations.length > 1 && (
                    <Field label={`Estoque atual de ${variation.name}`}>
                        {variation.stock_quantity} un.
                    </Field>
                )}
            </dl>

            <div className="mt-6  flex flex-wrap justify-end gap-3 text-sm font-medium">
                <Link
                    to={`/products?product_id=${product.id}`}
                    className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                    Ver produto
                </Link>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
                >
                    Fechar
                </button>
            </div>
        </Modal>
    )
}