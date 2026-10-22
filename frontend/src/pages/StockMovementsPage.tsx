import {  useCallback ,useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { getProducts } from "../api/products"
import { getStockMovements } from "../api/stockMovements"
import { MovementFormModal } from "../components/MovementFormModal"
import { Notice } from "../components/Notice"
import { Pagination } from "../components/Pagination"
import { useNotice } from "../hooks/useNotice"
import type { Product, StockMovement } from "../types"
import { normalizeText } from "../utils/format"

const PAGE_SIZE = 15

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
        <div className="mx-auto max-w-6xl p-4 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                        Movimentações de estoque
                    </h1>
                    <p className="text-sm text-slate-500">
                        {filtered.length}{" "}
                        {filtered.length === 1 ? "movimentação" : "movimentações"}
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
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
                    className="w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                    value={typeFilter ?? ""}
                    onChange={(e) => setFilter("type", e.target.value)}
                    className="rounded border border-slate-300 px-3 py-2 text-sm w-full sm:w-auto"
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
                        className="text-sm text-brand-600 hover:underline"
                        onClick={() => setPage(1)}
                    >
                        Limpar filtros
                    </Link>
                )}
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {filtered.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                    {movements.length === 0
                        ? "Nenhuma movimentação registrada ainda."
                        : "Nenhuma movimentação encontrada."}
                </p>
            ) : (
                <>
                    <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Data</th>
                                    <th className="px-4 py-3 font-medium">Produto</th>
                                    <th className="px-4 py-3 font-medium">Tipo</th>
                                    <th className="px-4 py-3 text-right font-medium">Quantidade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleMovements.map((movement) => (
                                    <tr key={movement.id} className="hover:bg-slate-50">
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
                                            {movement.product.size && (
                                                <span className="ml-2 text-xs text-slate-500">
                                                    {movement.product.size}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={
                                                    movement.type === "in"
                                                        ? "rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                                                        : "rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                                                }
                                            >
                                                {movement.type === "in" ? "Entrada" : "Saída"}
                                            </span>
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
                                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"
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

            <Notice message={notice} />
        </div>
    )
}