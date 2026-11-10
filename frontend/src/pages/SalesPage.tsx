import { useCallback, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { getSales } from "../api/sales"
import { Notice } from "../components/Notice"
import { Pagination } from "../components/Pagination"
import { SaleDetailModal } from "../components/SaleDetailModal"
import { useNotice } from "../hooks/useNotice"
import type { SaleList, SaleStatus } from "../types"
import { toIsoDate } from "../utils/date"
import { formatCurrency, normalizeText } from "../utils/format"
import { itemsSummary, saleSituation } from "../utils/sales"

const PAGE_SIZE = 15

type Period = "today" | "7d" | "month" | "all" | "custom"

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: "today", label: "Hoje" },
    { value: "7d", label: "Últimos 7 dias" },
    { value: "month", label: "Este mês" },
    { value: "all", label: "Todo o período" },
    { value: "custom", label: "Personalizado" },
]

const EMPTY: SaleList = { sales: [], total_sold: 0, total_paid: 0, total_open: 0 }

const inputClass = "rounded border border-slate-300 px-3 py-2 text-sm"

function periodRange(period: Period, from: string, to: string) {
    const today = new Date()

    if (period === "today") {
        return { start_date: toIsoDate(today), end_date: toIsoDate(today) }
    }

    if (period === "7d") {
        const start = new Date()
        start.setDate(start.getDate() - 6)
        return { start_date: toIsoDate(start), end_date: toIsoDate(today) }
    }

    if (period === "month") {
        const start = new Date(today.getFullYear(), today.getMonth(), 1)
        return { start_date: toIsoDate(start), end_date: toIsoDate(today) }
    }

    if (period === "custom") {
        return { start_date: from || undefined, end_date: to || undefined }
    }

    return {}
}

export function SalesPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const rawPeriod = searchParams.get("period")
    const period: Period = PERIOD_OPTIONS.some((option) => option.value === rawPeriod)
        ? (rawPeriod as Period)
        : "month"
    const from = searchParams.get("from") ?? ""
    const to = searchParams.get("to") ?? ""
    const status = (searchParams.get("status") as SaleStatus | null) ?? null
    const search = searchParams.get("q") ?? ""

    const [data, setData] = useState<SaleList>(EMPTY)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const { notice, showNotice } = useNotice()

    function setFilter(key: string, value: string) {
        const next = new URLSearchParams(searchParams)

        if (value) {
            next.set(key, value)
        } else {
            next.delete(key)
        }

        setSearchParams(next, { replace: true })
        setPage(1)
    }

    const loadData = useCallback(async () => {
        try {
            const result = await getSales({
                ...periodRange(period, from, to),
                ...(status ? { status } : {}),
            })
            setData(result)
            setError(null)
        } catch {
            setError("Não foi possível carregar as vendas.")
        }
    }, [period, from, to, status])

    useEffect(() => {
        loadData()
    }, [loadData])

    const filtered = data.sales.filter((sale) => {
        if (!search) return true

        const text = normalizeText(`${sale.customer_name ?? ""} ${itemsSummary(sale)}`)

        return text.includes(normalizeText(search))
    })

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const visibleSales = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    const selectedSale = data.sales.find((sale) => sale.id === selectedId) ?? null

    async function handleChanged(message: string) {
        await loadData()
        showNotice(message)
    }

    return (
        <div className="mx-auto max-w-6xl p-4 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Vendas</h1>
                    <p className="text-sm text-slate-500">
                        {filtered.length} {filtered.length === 1 ? "venda" : "vendas"}
                    </p>
                </div>
                <Link
                    to="/sales/new"
                    className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                    + Nova venda
                </Link>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-l-4 border-slate-200 border-l-slate-300 bg-white p-4">
                    <p className="text-sm font-medium text-slate-500">Vendido</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                        {formatCurrency(data.total_sold)}
                    </p>
                </div>
                <div className="rounded-lg border border-l-4 border-slate-200 border-l-emerald-500 bg-white p-4">
                    <p className="text-sm font-medium text-slate-500">Recebido</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                        {formatCurrency(data.total_paid)}
                    </p>
                </div>
                <div
                    className={`rounded-lg border border-l-4 border-slate-200 bg-white p-4 ${
                        data.total_open > 0 ? "border-l-amber-500" : "border-l-slate-300"
                    }`}
                >
                    <p className="text-sm font-medium text-slate-500">Em aberto (fiado)</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                        {formatCurrency(data.total_open)}
                    </p>
                </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input
                    type="search"
                    placeholder="Buscar por cliente ou produto"
                    value={search}
                    onChange={(e) => setFilter("q", e.target.value)}
                    className={`${inputClass} w-full max-w-sm`}
                />
                <select
                    value={period}
                    onChange={(e) => setFilter("period", e.target.value)}
                    className={`${inputClass} w-full sm:w-auto`}
                >
                    {PERIOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {period === "custom" && (
                    <>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFilter("from", e.target.value)}
                            className={inputClass}
                            aria-label="De"
                        />
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setFilter("to", e.target.value)}
                            className={inputClass}
                            aria-label="Até"
                        />
                    </>
                )}
                <select
                    value={status ?? ""}
                    onChange={(e) => setFilter("status", e.target.value)}
                    className={`${inputClass} w-full sm:w-auto`}
                >
                    <option value="">Todas</option>
                    <option value="completed">Concluídas</option>
                    <option value="canceled">Canceladas</option>
                </select>
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {filtered.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                    Nenhuma venda encontrada neste período.
                </p>
            ) : (
                <>
                    <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Data</th>
                                    <th className="px-4 py-3 font-medium">Cliente</th>
                                    <th className="px-4 py-3 font-medium">Itens</th>
                                    <th className="px-4 py-3 text-right font-medium">Total</th>
                                    <th className="px-4 py-3 font-medium">Situação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleSales.map((sale) => {
                                    const situation = saleSituation(sale)

                                    return (
                                        <tr
                                            key={sale.id}
                                            onClick={() => setSelectedId(sale.id)}
                                            className="cursor-pointer hover:bg-slate-50"
                                        >
                                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                                {new Date(sale.created_at).toLocaleString("pt-BR", {
                                                    dateStyle: "short",
                                                    timeStyle: "short",
                                                })}
                                            </td>
                                            <td className="px-4 py-3 text-slate-900">
                                                {sale.customer_name ?? "—"}
                                            </td>
                                            <td
                                                className="max-w-xs truncate px-4 py-3 text-slate-600"
                                                title={itemsSummary(sale)}
                                            >
                                                {itemsSummary(sale)}
                                            </td>
                                            <td
                                                className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums ${
                                                    sale.status === "canceled"
                                                        ? "text-slate-400 line-through"
                                                        : "text-slate-900"
                                                }`}
                                            >
                                                {formatCurrency(sale.total)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded px-2 py-0.5 text-xs font-medium ${situation.className}`}
                                                >
                                                    {situation.label}
                                                </span>
                                                {sale.status === "completed" && sale.balance > 0 && (
                                                    <span className="ml-2 text-xs text-slate-500">
                                                        falta {formatCurrency(sale.balance)}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <ul className="space-y-2 md:hidden">
                        {visibleSales.map((sale) => {
                            const situation = saleSituation(sale)

                            return (
                                <li
                                    key={sale.id}
                                    onClick={() => setSelectedId(sale.id)}
                                    className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-slate-900">
                                                {sale.customer_name ?? "Sem cliente"}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                                {itemsSummary(sale)}
                                            </p>
                                        </div>
                                        <p
                                            className={`shrink-0 text-lg font-semibold tabular-nums ${
                                                sale.status === "canceled"
                                                    ? "text-slate-400 line-through"
                                                    : "text-slate-900"
                                            }`}
                                        >
                                            {formatCurrency(sale.total)}
                                        </p>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                        <span>
                                            {new Date(sale.created_at).toLocaleString("pt-BR", {
                                                dateStyle: "short",
                                                timeStyle: "short",
                                            })}
                                        </span>
                                        <span>
                                            {sale.status === "completed" && sale.balance > 0
                                                ? `falta ${formatCurrency(sale.balance)} `
                                                : ""}
                                            <span
                                                className={`rounded px-2 py-0.5 font-medium ${situation.className}`}
                                            >
                                                {situation.label}
                                            </span>
                                        </span>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </>
            )}

            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />

            {selectedSale && (
                <SaleDetailModal
                    key={`${selectedSale.id}-${selectedSale.payments.length}-${selectedSale.status}`}
                    sale={selectedSale}
                    onClose={() => setSelectedId(null)}
                    onChanged={handleChanged}
                />
            )}

            <Notice message={notice} />
        </div>
    )
}