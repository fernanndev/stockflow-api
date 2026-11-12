import {  useCallback ,useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { getProducts } from "../api/products"
import { getStockMovements } from "../api/stockMovements"
import { MovementFormModal } from "../components/MovementFormModal"
import { MovementSummaryModal } from "../components/MovementSummaryModal"
import { Notice } from "../components/Notice"
import { Pagination } from "../components/Pagination"
import { useNotice } from "../hooks/useNotice"
import type { Product, StockMovement } from "../types"
import { normalizeText } from "../utils/format"
import { REASON_LABELS } from "../utils/movements" 

const PAGE_SIZE = 15

// the variation name only matters when the product has more than one
function variationLabel(movement: StockMovement): string | null {
    if (movement.product.variations.length < 2) return null

    return (
        movement.product.variations.find((variation) => variation.id === movement.variation_id)
            ?.name ?? null
    )
}

export function StockMovementsPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const productId = searchParams.get("product_id")
        ? Number(searchParams.get("product_id"))
        : null
    const typeFilter = searchParams.get("type")
    const search = searchParams.get("q") ?? ""
    const hasFilter = productId !== null || typeFilter !== null || search !== ""

    const [products, setProducts] = useState<Product[]>([])
    const [movements, setMovements] = useState<StockMovement[]>([])
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [showForm, setShowForm] = useState(false)
    const { notice, showNotice } = useNotice()
    const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null)

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

    const loadData = useCallback(async() => {
        try {
            const [productsData, movementsData] = await Promise.all([
                getProducts(),
                getStockMovements(productId ?? undefined),
            ])
            setProducts(productsData)
            setMovements(movementsData)
        } catch {
            setError("Não foi possível carregar as movimentações.")
        }
    }, [productId])

    useEffect(() => {
        loadData()
    }, [loadData])

    const filteredProductName = productId
        ? products.find((product) => product.id === productId)?.name
        : null

    const filtered = movements.filter((movement) => {
        if (typeFilter && movement.type !== typeFilter) return false
        if (search) {
            const text = normalizeText(
                `${movement.product.name} ${movement.product.size ?? ""}`,
            )
            if (!text.includes(normalizeText(search))) return false
        }
        return true
    })

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const visibleMovements = filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    )

    async function handleSaved(message: string) {
        setShowForm(false)
        await loadData()
        showNotice(message)
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="page-title">
                        Movimentações de estoque
                    </h1>
                    <p className="text-sm text-slate-500">
                        {filtered.length}{" "}
                        {filtered.length === 1 ? "movimentação" : "movimentações"}
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="btn btn-primary"
                >
                    + Registrar movimentação
                </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input
                    type="search"
                    placeholder="Buscar por produto"
                    value={search}
                    onChange={(e) => setFilter("q", e.target.value)}
                    className="ui-input w-full sm:max-w-sm"
                />
                <select
                    value={typeFilter ?? ""}
                    onChange={(e) => setFilter("type", e.target.value)}
                    className="ui-input w-full sm:w-auto"
                >
                    <option value="">Todos os tipos</option>
                    <option value="in">Entradas</option>
                    <option value="out">Saídas</option>
                </select>
                {productId && filteredProductName && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                        Produto: {filteredProductName}
                    </span>
                )}
                {hasFilter && (
                    <Link
                        to="/stock-movements"
                        className="text-sm font-medium text-brand-700 hover:underline"
                        onClick={() => setPage(1)}
                    >
                        Limpar filtros
                    </Link>
                )}
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {filtered.length === 0 ? (
                <p className="empty-state">
                    {movements.length === 0
                        ? "Nenhuma movimentação registrada ainda."
                        : "Nenhuma movimentação encontrada."}
                </p>
            ) : (
                <>
                    <div className="card hidden overflow-x-auto md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Data</th>
                                    <th className="px-4 py-3 font-medium">Produto</th>
                                    <th className="px-4 py-3 font-medium">Tipo</th>
                                    <th className="px-4 py-3 text-right font-medium">Quantidade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleMovements.map((movement) => (
                                    <tr
                                        key={movement.id}
                                        onClick={() => setSelectedMovement(movement)}
                                        className="cursor-pointer hover:bg-slate-50"
                                    >
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                            {new Date(movement.created_at).toLocaleString("pt-BR", {
                                                dateStyle: "short",
                                                timeStyle: "short",
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-slate-900">
                                                {movement.product.name}
                                            </span>
                                            {variationLabel(movement) && (
                                                <span className="badge ml-2 bg-slate-100 text-slate-600">
                                                    {variationLabel(movement)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={
                                                    movement.type === "in"
                                                        ? "badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                                                        : "badge bg-red-50 text-red-700 ring-1 ring-red-600/15"
                                                }
                                            >
                                                {movement.type === "in" ? "Entrada" : "Saída"}
                                            </span>
                                            {movement.reason && (
                                                <span className="ml-2 text-xs text-slate-500">
                                                    {REASON_LABELS[movement.reason]}
                                                </span>
                                            )}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right font-medium tabular-nums ${
                                                movement.type === "in" ? "text-emerald-700" : "text-red-700"
                                            }`}
                                        >
                                            {movement.type === "in" ? "+" : "−"}
                                            {movement.quantity}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <ul className="space-y-2 md:hidden">
                        {visibleMovements.map((movement) => (
                            <li
                                key={movement.id}
                                onClick={() => setSelectedMovement(movement)}
                                className="card flex cursor-pointer items-center justify-between gap-3 p-4 transition active:bg-slate-50"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-slate-900">
                                        {movement.product.name}
                                        {movement.product.size
                                            ? ` (${movement.product.size})`
                                            : ""}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {new Date(movement.created_at).toLocaleString("pt-BR", {
                                            dateStyle: "short",
                                            timeStyle: "short",
                                        })}
                                        {variationLabel(movement) ? ` · ${variationLabel(movement)}` : ""}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p
                                        className={`text-lg font-semibold tabular-nums ${
                                            movement.type === "in"
                                                ? "text-emerald-700"
                                                : "text-red-700"
                                        }`}
                                    >
                                        {movement.type === "in" ? "+" : "−"}
                                        {movement.quantity}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {movement.type === "in" ? "Entrada" : "Saída"}
                                        {movement.reason
                                            ? ` · ${REASON_LABELS[movement.reason]}`
                                            : ""}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />

            <MovementFormModal
                open={showForm}
                products={products}
                defaultProductId={productId ?? 0}
                onClose={() => setShowForm(false)}
                onSaved={handleSaved}
            />

            {selectedMovement && (
                <MovementSummaryModal
                    movement={selectedMovement}
                    onClose={() => setSelectedMovement(null)}
                />
            )}

            <Notice message={notice} />
        </div>
    )
}