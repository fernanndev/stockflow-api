import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { getCategories } from "../api/categories"
import { deleteProduct, getProducts } from "../api/products"
import { getStockMovements } from "../api/stockMovements"

import { ConfirmDialog } from "../components/ConfirmDialog"
import { ExpirationBadge } from "../components/ExpirationBadge"
import { Notice } from "../components/Notice"
import { ProductFormModal } from "../components/ProductFormModal"
import { StockBadge } from "../components/StockBadge"
import { ProductThumb } from "../components/ProductThumb"
import { Modal } from "../components/Modal"

import { useNotice } from "../hooks/useNotice"

import type { Category, Product } from "../types"

import { daysUntil, EXPIRING_SOON_DAYS, formatDate } from "../utils/date"
import { formatCurrency, normalizeText } from "../utils/format"
import { getImageUrl } from "../utils/image" 

export function ProductsPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const categoryId = searchParams.get("category_id")
        ? Number(searchParams.get("category_id"))
        : null
    const productId = searchParams.get("product_id")
        ? Number(searchParams.get("product_id"))
        : null
    const status = searchParams.get("status")
    const search = searchParams.get("q") ?? ""
    const hasFilter =
        categoryId !== null || productId !== null || status !== null || search !== ""

    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [error, setError] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [productToDelete, setProductToDelete] = useState<Product | null>(null)
    const [movementCount, setMovementCount] = useState(0)
    const { notice, showNotice } = useNotice()
    const [previewProduct, setPreviewProduct] = useState<Product | null>(null)
    const previewSrc = getImageUrl(previewProduct?.image_url ?? null)

    function setFilter(key: string, value: string) {
        const next = new URLSearchParams(searchParams)

        if (value) {
            next.set(key, value)
        } else {
            next.delete(key)
        }

        setSearchParams(next, { replace: true })
    }

    async function loadData() {
        try {
            const [productsData, categoriesData] = await Promise.all([
                getProducts(),
                getCategories(),
            ])
            setProducts(productsData)
            setCategories(categoriesData)
        } catch {
            setError("Não foi possível carregar os produtos.")
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const visibleProducts = products.filter((product) => {
        if (categoryId && product.category.id !== categoryId) return false
        if (productId && product.id !== productId) return false
        if (search) {
            const text = normalizeText(
                [product.name, product.description ?? "", product.size ?? ""].join(" "),
            )
            if (!text.includes(normalizeText(search))) return false
        }
        if (status === "low_stock" && product.stock_quantity > product.minimum_stock) {
            return false
        }
        if (
            status === "expiring" &&
            (!product.expiration_date || daysUntil(product.expiration_date) > EXPIRING_SOON_DAYS)
        ) {
            return false
        }
        return true
    })

    function openCreate() {
        setEditingProduct(null)
        setShowForm(true)
    }

    function openEdit(product: Product) {
        setEditingProduct(product)
        setShowForm(true)
    }

    async function handleSaved(message: string) {
        setShowForm(false)
        await loadData()
        showNotice(message)
    }

    async function requestDelete(product: Product) {
        setError(null)

        try {
            const movements = await getStockMovements(product.id)
            setMovementCount(movements.length)
            setProductToDelete(product)
        } catch {
            setError("Não foi possível verificar o histórico do produto.")
        }
    }

    async function handleDelete() {
        if (!productToDelete) return
        const name = productToDelete.name
        setError(null)

        try {
            await deleteProduct(productToDelete.id)
            await loadData()
            showNotice(`Produto "${name}" excluído.`)
        } catch {
            setError("Não foi possível excluir o produto.")
        } finally {
            setProductToDelete(null)
        }
    }

    return (
        <div className="mx-auto max-w-6xl p-4 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                        Produtos
                    </h1>
                    <p className="text-sm text-slate-500">
                        {visibleProducts.length}{" "}
                        {visibleProducts.length === 1 ? "produto" : "produtos"}
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                    + Novo produto
                </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input
                    type="search"
                    placeholder="Buscar por nome, descrição ou tamanho"
                    value={search}
                    onChange={(e) => setFilter("q", e.target.value)}
                    className="w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                    value={categoryId ?? ""}
                    onChange={(e) => setFilter("category_id", e.target.value)}
                    className="rounded border border-slate-300 px-3 py-2 text-sm w-full sm:w-auto"
                >
                    <option value="">Todas as categorias</option>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
                <select
                    value={status ?? ""}
                    onChange={(e) => setFilter("status", e.target.value)}
                    className="rounded border border-slate-300 px-3 py-2 text-sm w-full sm:w-auto"
                >
                    <option value="">Todas as situações</option>
                    <option value="low_stock">Estoque baixo</option>
                    <option value="expiring">Vencidos ou perto de vencer</option>
                </select>
                {hasFilter && (
                    <button
                        onClick={() => setSearchParams({})}
                        className="text-sm text-brand-600 hover:underline"
                    >
                        Limpar filtros
                    </button>
                )}
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {visibleProducts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                    Nenhum produto encontrado.
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3 font-medium">Produto</th>
                                <th className="px-4 py-3 font-medium">Categoria</th>
                                <th className="px-4 py-3 text-right font-medium">Preço</th>
                                <th className="px-4 py-3 text-right font-medium">Estoque</th>
                                <th className="px-4 py-3 font-medium">Validade</th>
                                <th className="px-4 py-3 text-right font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visibleProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <ProductThumb
                                                product={product}
                                                onClick={() => setPreviewProduct(product)}
                                            />
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {product.name}
                                                </p>
                                                {product.size && (
                                                    <p className="text-xs text-slate-500">
                                                        {product.size}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {product.category.name}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-900">
                                        {formatCurrency(product.price)}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right">
                                        <span className="font-medium text-slate-900">
                                            {product.stock_quantity}
                                        </span>
                                        <span className="text-slate-400">
                                            {" "}
                                            / mín. {product.minimum_stock}
                                        </span>
                                        <StockBadge
                                            quantity={product.stock_quantity}
                                            minimum={product.minimum_stock}
                                        />
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                        {product.expiration_date ? (
                                            <>
                                                {formatDate(product.expiration_date)}
                                                <ExpirationBadge isoDate={product.expiration_date} />
                                            </>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-4 text-sm font-medium">
                                            <Link
                                                to={`/stock-movements?product_id=${product.id}`}
                                                className="text-slate-600 hover:text-slate-900"
                                            >
                                                Movimentações
                                            </Link>
                                            <button
                                                onClick={() => openEdit(product)}
                                                className="text-brand-600 hover:text-brand-700"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => requestDelete(product)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Excluir
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ProductFormModal
                open={showForm}
                product={editingProduct}
                categories={categories}
                defaultCategoryId={categoryId ?? 0}
                onClose={() => setShowForm(false)}
                onSaved={handleSaved}
            />

            <Modal
                open={previewProduct !== null && previewSrc !==null}
                title={previewProduct?.name ?? ""}
                onClose={() => setPreviewProduct(null)}
            >
                {previewSrc && (
                    <img
                        src={previewSrc}
                        alt={previewProduct?.name}
                        className="mx-auto max-h-[70vh] rounded object-contain"
                    />
                )}
            </Modal>

            <ConfirmDialog
                open={productToDelete !== null}
                title={movementCount > 0 ? "Excluir produto e histórico" : "Excluir produto"}
                message={
                    movementCount === 0
                        ? `"${productToDelete?.name}" não tem movimentações de estoque. Deseja excluí-lo mesmo assim?`
                        : `"${productToDelete?.name}" tem ${movementCount} ${
                              movementCount === 1
                                  ? "movimentação registrada"
                                  : "movimentações registradas"
                          }. Ao excluir o produto, todo esse histórico também será apagado e não poderá ser recuperado. Deseja continuar?`
                }
                confirmLabel={movementCount > 0 ? "Excluir tudo" : "Excluir"}
                onConfirm={handleDelete}
                onCancel={() => setProductToDelete(null)}
            />

            <Notice message={notice} />
        </div>
    )
}