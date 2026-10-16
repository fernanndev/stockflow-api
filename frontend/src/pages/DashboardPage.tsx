import { useEffect, useState } from "react"
import { formatDate } from "../utils/date"
import { getDashboard, getExpiringProducts, getLowStockProducts } from "../api/reports"
import type { DashboardResponse, Product } from "../types"
import { Link } from "react-router-dom"
import { KpiCard } from "../components/KpiCard"
import { ExpirationBadge } from "../components/ExpirationBadge"
import { EXPIRING_SOON_DAYS } from "../utils/date"
import { formatCurrency } from "../utils/format"

export function DashboardPage() {
    const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
    const [lowStock, setlowStock] = useState<Product[]>([])
    const [expiring, setExpiring] = useState<Product[]>([])
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadData() {
            try {
                const [dashboardData, lowStockData, expiringData] = await Promise.all([
                    getDashboard(),
                    getLowStockProducts(),
                    getExpiringProducts(),
                ])
                setDashboard(dashboardData)
                setlowStock(lowStockData)
                setExpiring(expiringData)
                setUpdatedAt(new Date())
            } catch {
                setError("Não foi possível carregar os dados do dashboard")
            }
        }

        loadData()
    }, [])

    if (error) {
        return <p className="p-8 text-red-600">{error}</p>
    }

    if (!dashboard) {
        return <p className="p-8 text-gray-500">Carregando...</p>
    }

        return (
        <div className="mx-auto max-w-6xl p-8">
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                        Visão geral
                    </h1>
                    <p className="text-sm text-slate-500">O que precisa da sua atenção hoje</p>
                </div>
                {updatedAt && (
                    <p className="text-xs text-slate-400">
                        Atualizado às{" "}
                        {updatedAt.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </p>
                )}
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <KpiCard
                    label="Estoque baixo"
                    value={dashboard.low_stock_count}
                    to="/products?status=low_stock"
                    tone={dashboard.low_stock_count > 0 ? "danger" : "neutral"}
                    hint={dashboard.low_stock_count > 0 ? "Precisam de reposição" : "Tudo em dia"}
                />
                <KpiCard
                    label={`Vencendo em ${EXPIRING_SOON_DAYS} dias`}
                    value={dashboard.expiring_count}
                    to="/products?status=expiring"
                    tone={dashboard.expiring_count > 0 ? "warning" : "neutral"}
                    hint={
                        dashboard.expiring_count > 0
                            ? "Vencidos ou perto de vencer"
                            : "Nenhum produto vencendo"
                    }
                />
            </div>

            <div className="mb-10 grid gap-4 sm:grid-cols-3">
                <KpiCard label="Produtos" value={dashboard.total_products} to="/products" />
                <KpiCard label="Categorias" value={dashboard.total_categories} to="/categories" />
                <KpiCard
                    label="Valor em estoque"
                    value={formatCurrency(dashboard.total_stock_value)}
                    to="/products"
                />
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <section>
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-base font-semibold text-slate-900">Estoque baixo</h2>
                        <Link
                            to="/products?status=low_stock"
                            className="text-sm text-brand-600 hover:underline"
                        >
                            Ver todos
                        </Link>
                    </div>

                    {lowStock.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                            Nenhum produto abaixo do mínimo.
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                            {lowStock.map((product) => (
                                <li key={product.id}>
                                    <Link
                                        to={`/products?product_id=${product.id}`}
                                        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {product.name}
                                                {product.size ? ` (${product.size})` : ""}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {product.category.name}
                                            </p>
                                        </div>
                                        <span className="whitespace-nowrap text-sm font-medium text-red-700">
                                            {product.stock_quantity} un · mín. {product.minimum_stock}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section>
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-base font-semibold text-slate-900">
                            Vencidos ou perto de vencer
                        </h2>
                        <Link
                            to="/products?status=expiring"
                            className="text-sm text-brand-600 hover:underline"
                        >
                            Ver todos
                        </Link>
                    </div>

                    {expiring.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                            Nenhum produto vencendo nos próximos {EXPIRING_SOON_DAYS} dias.
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                            {expiring.map((product) => (
                                <li key={product.id}>
                                    <Link
                                        to={`/products?product_id=${product.id}`}
                                        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {product.name}
                                                {product.size ? ` (${product.size})` : ""}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {product.category.name}
                                            </p>
                                        </div>
                                        {product.expiration_date && (
                                            <span className="whitespace-nowrap text-sm text-slate-600">
                                                {formatDate(product.expiration_date)}
                                                <ExpirationBadge isoDate={product.expiration_date} />
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    )
}