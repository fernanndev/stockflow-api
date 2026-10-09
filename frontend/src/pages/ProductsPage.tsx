import { useEffect, useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
    createProduct,
    deleteProduct,
    getProducts,
    updateProduct,
    type ProductCreateInput,
    type ProductUpdateInput,
} from "../api/products"
import { ExpirationBadge } from "../components/ExpirationBadge"
import { formatDate } from "../utils/date"
import { getCategories } from "../api/categories"
import type { Category, Product } from "../types"

const emptyForm: ProductCreateInput = {
    name: "",
    description: "",
    price: 0,
    stock_quantity: 0,
    minimum_stock: 0,
    size: "",
    expiration_date: null,
    category_id: 0,
}

export function ProductsPage() {
    const [searchParams] = useSearchParams()
    const categoryId = searchParams.get("category_id")
        ? Number(searchParams.get("category_id"))
        : null

    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState<ProductCreateInput>(emptyForm)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editingForm, setEditingForm] = useState<ProductUpdateInput | null>(null)

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

    useEffect(() => {
        if (categoryId) {
            setForm((prev) => ({ ...prev, category_id: categoryId }))
        }
    }, [categoryId])

    const visibleProducts = categoryId
        ? products.filter((product) => product.category.id === categoryId)
        : products

    const filteredCategoryName = categoryId
        ? categories.find((category) => category.id === categoryId)?.name
        : null

    async function handleCreate(event: FormEvent) {
        event.preventDefault()
        setError(null)

        try {
            await createProduct(form)
            setForm({ ...emptyForm, category_id: categoryId ?? 0 })
            await loadData()
        } catch {
            setError("Não foi possível criar o produto.")
        }
    }

    async function handleDelete(id: number) {
        setError(null)

        try {
            await deleteProduct(id)
            await loadData()
        } catch {
            setError("Não foi possível excluir. Verifique se não há movimentações de estoque para esse produto.")
        }
    }

    function startEditing(product: Product) {
        setEditingId(product.id)
        setEditingForm({
            name: product.name,
            description: product.description ?? "",
            price: product.price,
            minimum_stock: product.minimum_stock,
            size: product.size ?? "",
            expiration_date: product.expiration_date,
            category_id: product.category.id,
        })
    }

    async function handleUpdate(id: number) {
        if (!editingForm) return
        setError(null)

        try {
            await updateProduct(id, editingForm)
            setEditingId(null)
            setEditingForm(null)
            await loadData()
        } catch {
            setError("Não foi possível atualizar o produto.")
        }
    }

    return (
        <div className="p-8">
            <h1 className="mb-2 text-2xl font-bold text-gray-800">
                Produtos{filteredCategoryName ? ` — ${filteredCategoryName}` : ""}
            </h1>

            {categoryId && (
                <Link to="/products" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
                    Ver todos os produtos
                </Link>
            )}

            <form onSubmit={handleCreate} className="mb-6 grid max-w-2xl grid-cols-2 gap-3 rounded-lg bg-white p-4 shadow">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Categoria</label>
                    <select
                        value={form.category_id}
                        onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
                        required
                        className="w-full rounded border border-gray-300 px-3 py-2"
                    >
                        <option value={0} disabled>
                            Selecione
                        </option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
                    <input
                        type="text"
                        value={form.description ?? ""}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Preço</label>
                    <input
                        type="number"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                        required
                        className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Tamanho (ex: M, 500g)</label>
                    <input
                        type="text"
                        value={form.size ?? ""}
                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                        className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Estoque inicial</label>
                    <input
                        type="number"
                        value={form.stock_quantity}
                        onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })}
                        className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Estoque mínimo</label>
                    <input
                        type="number"
                        value={form.minimum_stock}
                        onChange={(e) => setForm({ ...form, minimum_stock: Number(e.target.value) })}
                        className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Validade</label>
                    <input 
                    type="date" 
                    value={form.expiration_date ?? ""}
                    onChange={(e) => setForm({ ...form, expiration_date: e.target.value || null })}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                </div>


                <button
                    type="submit"
                    className="col-span-2 rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
                >
                    Adicionar produto
                </button>
            </form>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <ul className="space-y-2">
                {visibleProducts.map((product) => (
                    <li key={product.id} className="rounded-lg bg-white p-4 shadow">
                        {editingId === product.id && editingForm ? (
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={editingForm.name}
                                    onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })}
                                    className="rounded border border-gray-300 px-2 py-1"
                                />
                                <select
                                    value={editingForm.category_id}
                                    onChange={(e) =>
                                        setEditingForm({ ...editingForm, category_id: Number(e.target.value) })
                                    }
                                    className="rounded border border-gray-300 px-2 py-1"
                                >
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    value={editingForm.description ?? ""}
                                    onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                                    className="col-span-2 rounded border border-gray-300 px-2 py-1"
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingForm.price}
                                    onChange={(e) => setEditingForm({ ...editingForm, price: Number(e.target.value) })}
                                    className="rounded border border-gray-300 px-2 py-1"
                                />
                                <input
                                    type="text"
                                    value={editingForm.size ?? ""}
                                    onChange={(e) => setEditingForm({ ...editingForm, size: e.target.value })}
                                    className="rounded border border-gray-300 px-2 py-1"
                                />
                                <input
                                    type="number"
                                    value={editingForm.minimum_stock}
                                    onChange={(e) =>
                                        setEditingForm({ ...editingForm, minimum_stock: Number(e.target.value) })
                                    }
                                    className="rounded border border-gray-300 px-2 py-1"
                                />
                                <input 
                                type="date"
                                value={editingForm.expiration_date ?? ""}
                                onChange={(e) =>
                                    setEditingForm({ ...editingForm, expiration_date: e.target.value || null })
                                }
                                className="rounded border border-gray-300 px-2 py-1"
                                />

                                <div className="col-span-2 flex gap-2">
                                    <button
                                        onClick={() => handleUpdate(product.id)}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                    >
                                        Salvar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingId(null)
                                            setEditingForm(null)
                                        }}
                                        className="text-sm font-medium text-gray-500 hover:text-gray-700"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">
                                        {product.name}
                                        {product.size ? ` (${product.size})` : ""}
                                        {product.expiration_date && (
                                            <ExpirationBadge isoDate={product.expiration_date} />
                                        )}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {product.category.name} — R$ {product.price.toFixed(2)} —{" "}
                                        {product.stock_quantity} em estoque (mín: {product.minimum_stock})
                                        {product.expiration_date && ` - Val: ${formatDate(product.expiration_date)}`}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => startEditing(product)}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="text-sm font-medium text-red-600 hover:text-red-800"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        )}
                    </li>
                ))}
            </ul>

            {visibleProducts.length === 0 && (
                <p className="text-gray-500">Nenhum produto encontrado.</p>
            )}
        </div>
    )
}