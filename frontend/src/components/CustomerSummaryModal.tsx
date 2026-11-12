import { useCallback, useEffect, useState } from "react"
import { getCustomer } from "../api/customers"
import type { Customer, Sale } from "../types"
import { formatCurrency } from "../utils/format"
import { formatPhone, itemsSummary, saleSituation, whatsappLink } from "../utils/sales"
import { Modal } from "./Modal"
import { SaleDetailModal } from "./SaleDetailModal"

const RECENT_SALES = 5

interface CustomerSummaryModalProps {
    customer: Customer
    onClose: () => void
    onEdit: () => void
    // a payment or cancellation changed the customer's numbers: the page reloads the list
    onChanged: (message: string) => void
}

function Field({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
        </div>
    )
}

export function CustomerSummaryModal({
    customer,
    onClose,
    onEdit,
    onChanged,
}: CustomerSummaryModalProps) {
    const [sales, setSales] = useState<Sale[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [selectedId, setSelectedId] = useState<number | null>(null)

    const load = useCallback(async () => {
        try {
            const detail = await getCustomer(customer.id)
            setSales(detail.sales)
            setError(null)
        } catch {
            setError("Não foi possível carregar as compras.")
        }
    }, [customer.id])

    useEffect(() => {
        load()
    }, [load])

    const selectedSale = sales?.find((sale) => sale.id === selectedId) ?? null
    const recentSales = (sales ?? []).slice(0, RECENT_SALES)

    async function handleSaleChanged(message: string) {
        await load()
        onChanged(message)
    }

    return (
        <>
            {/* hidden while a sale is open, so only one modal (and one Esc key) is active */}
            <Modal
                open={selectedSale === null}
                title={customer.name}
                onClose={onClose}
                widthClass="max-w-lg"
            >
                <div className="space-y-5">
                    {(customer.phone || customer.notes) && (
                        <div className="space-y-2 text-sm">
                            {customer.phone && (
                                <p className="flex flex-wrap items-center gap-x-3 text-slate-700">
                                    {formatPhone(customer.phone)}
                                    <a
                                        href={whatsappLink(customer.phone, "")}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-medium text-emerald-700 hover:underline"
                                    >
                                        Abrir WhatsApp
                                    </a>
                                </p>
                            )}
                            {customer.notes && (
                                <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-slate-700">
                                    {customer.notes}
                                </p>
                            )}
                        </div>
                    )}

                    <dl className="grid grid-cols-2 gap-4">
                        <Field label="Compras">{customer.purchases}</Field>
                        <Field label="Total gasto">{formatCurrency(customer.total_spent)}</Field>
                        <Field label="Última compra">
                            {customer.last_purchase_at
                                ? new Date(customer.last_purchase_at).toLocaleDateString("pt-BR")
                                : "—"}
                        </Field>
                        <Field label="Em aberto (fiado)">
                            <span
                                className={
                                    customer.open_balance > 0
                                        ? "font-semibold text-amber-700"
                                        : "text-slate-500"
                                }
                            >
                                {customer.open_balance > 0
                                    ? formatCurrency(customer.open_balance)
                                    : "Nada em aberto"}
                            </span>
                        </Field>
                    </dl>

                    <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                            Últimas compras
                        </p>

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        {!error && sales === null && (
                            <p className="text-sm text-slate-500">Carregando...</p>
                        )}

                        {sales !== null && sales.length === 0 && (
                            <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
                                Este cliente ainda não tem compras.
                            </p>
                        )}

                        {recentSales.length > 0 && (
                            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                                {recentSales.map((sale) => {
                                    const situation = saleSituation(sale)

                                    return (
                                        <li key={sale.id}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedId(sale.id)}
                                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-slate-50"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-slate-900">
                                                        {itemsSummary(sale)}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-500">
                                                        {new Date(sale.created_at).toLocaleDateString(
                                                            "pt-BR",
                                                        )}{" "}
                                                        <span className={`badge ${situation.className}`}>
                                                            {situation.label}
                                                        </span>
                                                        {sale.status === "completed" &&
                                                            sale.balance > 0 &&
                                                            ` · falta ${formatCurrency(sale.balance)}`}
                                                    </p>
                                                </div>
                                                <p
                                                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                                                        sale.status === "canceled"
                                                            ? "text-slate-400 line-through"
                                                            : "text-slate-900"
                                                    }`}
                                                >
                                                    {formatCurrency(sale.total)}
                                                </p>
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}

                        {sales !== null && sales.length > RECENT_SALES && (
                            <p className="mt-1 text-xs text-slate-500">
                                Mostrando as {RECENT_SALES} mais recentes, de {sales.length}.
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 text-sm font-medium">
                        <button type="button" onClick={onClose} className="btn btn-ghost">
                            Fechar
                        </button>
                        <button type="button" onClick={onEdit} className="btn btn-primary">
                            Editar
                        </button>
                    </div>
                </div>
            </Modal>

            {selectedSale && (
                <SaleDetailModal
                    key={`${selectedSale.id}-${selectedSale.payments.length}-${selectedSale.status}`}
                    sale={selectedSale}
                    onClose={() => setSelectedId(null)}
                    onChanged={handleSaleChanged}
                />
            )}
        </>
    )
}