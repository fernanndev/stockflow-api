import { useEffect, useState } from "react"
import { ExpirationBadge } from "../components/ExpirationBadge"
import { formatDate } from "../utils/date"
import { getDashboard, getExpiringProducts, getLowStockProducts } from "../api/reports"
import type { DashboardResponse, Product } from "../types"

export function DashboardPage() {
    const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
    const [lowStock, setlowStock] = useState<Product[]>([])
    const [expiring, setExpiring] = useState<Product[]>([])
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
        <div className="p-8">
            <h1 className="mb-6 text-2xl font-bold text-gray-800">Dashboard</h1>

            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-lg bg-white p-4 shadow">
                    <p className="text-sm text-gray-500">Produtos</p>
                    <p className="text-2xl font-bold">{dashboard.total_products}</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow">
                    <p className="text-sm text-gray-500">Categorias</p>
                    <p className="text-2xl font-bold">{dashboard.total_categories}</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow">
                    <p className="text-sm text-gray-500">Valor em Estoque</p>
                    <p className="text-2xl font-bold"> R$ {dashboard.total_stock_value.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow">
                    <p className="text-sm text-gray-500">Estoque baixo</p>
                    <p className="text-2xl font-bold">{dashboard.low_stock_count}</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow">
                    <p className="text-sm text-gray-500">Vencendo em 30 dias</p>
                    <p className="text-2xl font-bold">{dashboard.expiring_count}</p>

                </div>
            </div>

            <h2 className="mb-4 text-lg font-semibold text-gray-800">
                Produtos com estoque baixo
            </h2>
            {lowStock.length === 0 ? (
                <p className="text-gray-500">Nenhum produto abaixo do estoque mínimo.</p>
            ): (
                <ul className="space-y-2">
                    {lowStock.map((product) =>(
                        <li
                            key={product.id}
                            className="rounded-lg bg-white p-4 shadow"
                        >
                            {product.name} - {product.stock_quantity} em estoque
                            (mínimo: {product.minimum_stock})
                        </li>
                    ))}
                </ul>
            )}

            <h2 className="mb-4 mt-8 text-lg font-semibold text-gray-800">
               Produtos vencidos ou perto de vencer 
            </h2>
            {expiring.length === 0 ? (
                <p className="text-gray-500">Nenhum produto vencendo nos próximos 30 dias.</p>
            ) : (
                <ul className="space-y-2">
                    {expiring.map((product) => (
                        <li key={product.id} className="rounded-lg bg-white p-4 shadow">
                            {product.name}
                            {product.size ? ` (${product.size}) ` : ""}
                            {product.expiration_date && (
                                <>
                                    {"- Val: "}
                                    {formatDate(product.expiration_date)}
                                    <ExpirationBadge isoDate={product.expiration_date} />
                                </>
                            )}

                        </li>
                    ))}
                </ul>
            )}

        </div>
    )
}