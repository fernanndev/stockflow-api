import { useState, type FormEvent } from "react"
import { addSalePayment, cancelSale } from "../api/sales"
import type { PaymentMethod, Sale } from "../types"
import { formatCurrency } from "../utils/format"
import {
    PAYMENT_METHOD_LABELS,
    PAYMENT_METHOD_OPTIONS,
    chargeMessage,
    formatPhone,
    saleProfit,
    saleSituation,
    whatsappLink,
} from "../utils/sales"
import { ConfirmDialog } from "./ConfirmDialog"
import { Modal } from "./Modal"

interface SaleDetailModalProps {
    sale: Sale
    onClose: () => void
    onChanged: (message: string) => void
}

const inputClass = "w-full rounded border border-slate-300 px-3 py-2 text-sm"
const labelClass = "mb-1 block text-sm font-medium text-slate-700"

function Row({
    label,
    value,
    className = "text-slate-900",
}: {
    label: string
    value: string
    className?: string
}) {
    return (
        <div className="flex justify-between text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className={`font-medium tabular-nums ${className}`}>{value}</dd>
        </div>
    )
}

export function SaleDetailModal({ sale, onClose, onChanged }: SaleDetailModalProps) {
    const [amount, setAmount] = useState(sale.balance > 0 ? sale.balance.toFixed(2) : "")
    const [method, setMethod] = useState<PaymentMethod>("pix")
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [confirmCancel, setConfirmCancel] = useState(false)

    const situation = saleSituation(sale)
    const isCompleted = sale.status === "completed"
    const hasBalance = isCompleted && sale.balance > 0
    const result = isCompleted ? saleProfit(sale) : null

    async function handlePayment(event: FormEvent) {
        event.preventDefault()
        setError(null)

        const value = Number(amount)

        if (!Number.isFinite(value) || value <= 0) {
            setError("Informe um valor maior que zero.")
            return
        }

        if (Math.round(value * 100) > Math.round(sale.balance * 100)) {
            setError(`O valor não pode passar do que falta pagar (${formatCurrency(sale.balance)}).`)
            return
        }

        setSaving(true)

        try {
            await addSalePayment(sale.id, { amount: value, method })
            onChanged("Pagamento registrado.")
        } catch {
            setError("Não foi possível registrar o pagamento.")
        } finally {
            setSaving(false)
        }
    }

    async function handleCancel() {
        setConfirmCancel(false)
        setError(null)

        try {
            await cancelSale(sale.id)
            onChanged("Venda cancelada. O estoque foi devolvido.")
            onClose()
        } catch {
            setError("Não foi possível cancelar a venda.")
        }
    }

    return (
        <>
            <Modal open title={`Venda #${sale.id}`} onClose={onClose} widthClass="max-w-lg">
                <div className="space-y-5">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-600">
                            {new Date(sale.created_at).toLocaleString("pt-BR", {
                                dateStyle: "long",
                                timeStyle: "short",
                            })}
                        </p>
                        <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${situation.className}`}
                        >
                            {situation.label}
                        </span>
                    </div>

                    {sale.canceled_at && (
                        <p className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-600">
                            Cancelada em{" "}
                            {new Date(sale.canceled_at).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                            })}
                            . O estoque foi devolvido.
                        </p>
                    )}

                    {sale.customer_name && (
                        <div className="text-sm">
                            <p className="text-xs uppercase tracking-wide text-slate-400">Cliente</p>
                            <p className="mt-0.5 font-medium text-slate-900">{sale.customer_name}</p>
                            {sale.customer_phone && (
                                <p className="text-slate-600">{formatPhone(sale.customer_phone)}</p>
                            )}
                            {hasBalance && sale.customer_phone && (
                                <a
                                    href={whatsappLink(sale.customer_phone, chargeMessage(sale))}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-block text-sm font-medium text-emerald-700 hover:underline"
                                >
                                    Cobrar no WhatsApp
                                </a>
                            )}
                        </div>
                    )}

                    <div>
                        <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Itens</p>
                        <ul className="divide-y divide-slate-100 rounded border border-slate-200">
                            {sale.items.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex items-start justify-between gap-3 px-3 py-2 text-sm"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-900">
                                            {item.product_name}
                                            {item.is_gift && (
                                                <span className="ml-2 rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                                                    Brinde
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {item.variation_name !== "Padrão"
                                                ? `${item.variation_name} · `
                                                : ""}
                                            {item.quantity} × {formatCurrency(item.unit_price)}
                                        </p>
                                    </div>
                                    <p className="shrink-0 font-medium tabular-nums text-slate-900">
                                        {formatCurrency(
                                            item.is_gift ? 0 : item.unit_price * item.quantity,
                                        )}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {sale.packagings.length > 0 && (
                        <div>
                            <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">
                                Embalagens usadas
                            </p>
                            <p className="text-sm text-slate-700">
                                {sale.packagings
                                    .map((item) => `${item.quantity}× ${item.packaging_name}`)
                                    .join(", ")}
                            </p>
                        </div>
                    )}

                    <dl className="space-y-1 border-t border-slate-100 pt-4">
                        <Row label="Total" value={formatCurrency(sale.total)} />
                        <Row label="Pago" value={formatCurrency(sale.paid_amount)} />
                        {hasBalance && (
                            <Row
                                label="Falta pagar"
                                value={formatCurrency(sale.balance)}
                                className="text-amber-700"
                            />
                        )}
                        {result && (
                            <>
                                <Row label="Custo" value={formatCurrency(result.cost)} />
                                <Row
                                    label="Lucro"
                                    value={formatCurrency(result.profit)}
                                    className={
                                        result.profit >= 0 ? "text-emerald-700" : "text-red-700"
                                    }
                                />
                            </>
                        )}
                    </dl>

                    {sale.payments.length > 0 && (
                        <div>
                            <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">
                                Pagamentos
                            </p>
                            <ul className="space-y-1 text-sm">
                                {sale.payments.map((payment) => (
                                    <li key={payment.id} className="flex justify-between">
                                        <span className="text-slate-600">
                                            {PAYMENT_METHOD_LABELS[payment.method]} ·{" "}
                                            {new Date(payment.created_at).toLocaleDateString(
                                                "pt-BR",
                                            )}
                                        </span>
                                        <span className="font-medium tabular-nums text-slate-900">
                                            {formatCurrency(payment.amount)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {hasBalance && (
                        <form
                            onSubmit={handlePayment}
                            className="space-y-3 rounded border border-slate-200 bg-slate-50 p-3"
                        >
                            <p className="text-sm font-medium text-slate-700">
                                Registrar pagamento
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Valor</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Forma</label>
                                    <select
                                        value={method}
                                        onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                                        className={inputClass}
                                    >
                                        {PAYMENT_METHOD_OPTIONS.map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                            >
                                Registrar pagamento
                            </button>
                        </form>
                    )}

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex flex-wrap justify-between gap-3 text-sm font-medium">
                        {isCompleted ? (
                            <button
                                type="button"
                                onClick={() => setConfirmCancel(true)}
                                className="rounded border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
                            >
                                Cancelar venda
                            </button>
                        ) : (
                            <span />
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded px-4 py-2 text-slate-600 hover:bg-slate-100"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                open={confirmCancel}
                title="Cancelar venda"
                message="O estoque e as embalagens voltam para onde saíram, e o valor deixa de contar nos totais. O registro da venda continua no histórico."
                confirmLabel="Cancelar venda"
                onConfirm={handleCancel}
                onCancel={() => setConfirmCancel(false)}
            />
        </>
    )
}