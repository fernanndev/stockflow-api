import { useEffect, useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { getProducts } from "../api/products"
import { createStockMovement, getStockMovements } from "../api/stockMovements"
import type { Product, StockMovement } from "../types"

export function StockMovementsPage() {
    const [searchParams] = useSearchParams()
    const productId = searchParams.get("product_id")
        ? Number(searchParams.get("product_id"))
        : null

    const [products, setProducts] = useState<Product[]>([])
    const [movements, setMovements] = useState<StockMovement[]>([])
    const [error, setError] = useState<string | null>(null)
    const [selectedProductId, setSelectedProductId] = useState(0)
    const [type, setType] = useState<"in" | "out">("in")
    const [quantity, setQuantity] = useState(1)

    async function loadData() {
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
    }

    useEffect(() => {
        loadData()
    }, [productId])

    useEffect(() => {
        if (productId) {
            setSelectedProductId(productId)
        }
    }, [productId])

    const filteredProductName = productId
        ? products.find((product) => product.id === productId)?.name
        : null

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)

        try {
            await createStockMovement({
                product_id: selectedProductId,
                type,
                quantity,
            })
            setQuantity(1)
            await loadData()
        } catch {
            setError("Não foi possível registrar. Verifique se há estoque suficiente para a saída.")
        }
    }

    return (
        <div className="p-8">
            <h1 className="mb-2 text-2xl font-bold text-gray-800">
                Movimentações{filteredProductName ? ` — ${filteredProductName}` : ""}
            </h1>

            {productId && (
                <Link
                    to="/stock-movements"
                    className="mb-6 inline-block text-sm text-blue-600 hover:underline"
                >
                    Ver todas as movimentações
                </Link>
            )}

            <form
                onSubmit={handleSubmit}
                className="mb-6 grid max-w-2xl grid-cols-3 gap-3 rounded-lg bg-white p-4 shadow"
            >
                <div className="col-span-3">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Produto</label>
                    <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(Number(e.target.value))}
                        required
                        className="w-full rounded border border-gray-300 px-3 py-2"
                    >
                        <option value={0} disabled>
                            Selecione
                        </option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                                {product.size ? ` (${product.size})` : ""} — estoque: {product.stock_quantity}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as "in" | "out")}
                        className="w-full rounded border border-gray-300 px-3 py-2"
                    >
                        <option value="in">Entrada</option>
                        <option value="out">Saída</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Quantidade</label>
                    <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        required
                        className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                </div>

                <div className="flex items-end">
                    <button
                        type="submit"
                        className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
                    >
                        Registrar
                    </button>
                </div>
            </form>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {movements.length === 0 ? (
                <p className="text-gray-500">Nenhuma movimentação registrada.</p>
            ) : (
                <ul className="space-y-2">
                    {movements.map((movement) => (
                        <li
                            key={movement.id}
                            className="flex items-center justify-between rounded-lg bg-white p-4 shadow"
                        >
                            <div>
                                <p className="font-medium">
                                    {movement.product.name}
                                    {movement.product.size ? ` (${movement.product.size})` : ""}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {new Date(movement.created_at).toLocaleString("pt-BR")}
                                </p>
                            </div>
                            <span
                                className={
                                    movement.type === "in"
                                        ? "rounded bg-green-100 px-2 py-1 text-sm font-medium text-green-700"
                                        : "rounded bg-red-100 px-2 py-1 text-sm font-medium text-red-700"
                                }
                            >
                                {movement.type === "in" ? "+" : "−"}
                                {movement.quantity}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}