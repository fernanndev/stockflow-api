import type { Packaging } from "../types"
import { formatCurrency, formatUnitCost } from "../utils/format"
import { getImageUrl } from "../utils/image"

import { Modal } from "./Modal"

interface PackagingSummaryModalProps {
    packaging: Packaging
    onClose: () => void
    onPurchase: () => void
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

export function PackagingSummaryModal({
    packaging,
    onClose,
    onPurchase,
    onEdit,
}: PackagingSummaryModalProps) {
    const imageSrc = getImageUrl(packaging.image_url)

    return (
        <Modal open title={packaging.name} onClose={onClose} widthClass="max-w-lg">
            {imageSrc && (
                <img
                    src={imageSrc}
                    alt={packaging.name}
                    className="mb-4 max-h-64 w-full rounded-lg bg-slate-50 object-contain"
                />
            )}

            <dl className="grid grid-cols-2 gap-4">
                <Field label="Estoque">{packaging.stock_quantity} un</Field>
                <Field label="Custo por unidade">{formatUnitCost(packaging.unit_cost)}</Field>
                <Field label="Valor em estoque">
                    {formatCurrency(packaging.stock_quantity * packaging.unit_cost)}
                </Field>
            </dl>

            <div className="mt-6 flex flex-wrap justify-end gap-3 text-sm font-medium">
                <button
                    type="button"
                    onClick={onPurchase}
                    className="btn btn-secondary"
                >
                    Registrar compra
                </button>
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