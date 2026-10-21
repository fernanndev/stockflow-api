import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { deleteCategory, getCategories } from "../api/categories"
import { getProducts } from "../api/products"
import { CategoryFormModal } from "../components/CategoryFormModal"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { Notice } from "../components/Notice"
import { Pagination } from "../components/Pagination"
import { useNotice } from "../hooks/useNotice"
import type { Category } from "../types"
import { normalizeText } from "../utils/format"

const PAGE_SIZE = 10

export function CategoriesPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const search = searchParams.get("q") ?? ""

    const [categories, setCategories] = useState<Category[]>([])
    const [productCounts, setProductCounts] = useState<Record<number, number>>({})
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [showForm, setShowForm] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
    const { notice, showNotice } = useNotice()

    async function loadData() {
        try {
            const [categoriesData, productsData] = await Promise.all([
                getCategories(),
                getProducts(),
            ])

            const counts: Record<number, number> = {}
            for (const product of productsData) {
                counts[product.category.id] = (counts[product.category.id] ?? 0) + 1
            }

            setCategories(categoriesData)
            setProductCounts(counts)
        } catch {
            setError("Não foi possível carregar as categorias.")
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    function handleSearch(value: string) {
        const next = new URLSearchParams(searchParams)

        if (value) {
            next.set("q", value)
        } else {
            next.delete("q")
        }

        setSearchParams(next, { replace: true })
        setPage(1)
    }

    const filtered = categories
        .filter((category) => normalizeText(category.name).includes(normalizeText(search)))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const visibleCategories = filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    )

    function openCreate() {
        setEditingCategory(null)
        setShowForm(true)
    }

    function openEdit(category: Category) {
        setEditingCategory(category)
        setShowForm(true)
    }

    async function handleSaved(message: string) {
        setShowForm(false)
        await loadData()
        showNotice(message)
    }

    function requestDelete(category: Category) {
        const count = productCounts[category.id] ?? 0

        if (count > 0) {
            setError(
                `Não é possível excluir "${category.name}": ela tem ${count} ${
                    count === 1 ? "produto" : "produtos"
                }. Mova ou exclua esses produtos primeiro.`,
            )
            return
        }

        setError(null)
        setCategoryToDelete(category)
    }

    async function handleDelete() {
        if (!categoryToDelete) return
        const name = categoryToDelete.name
        setError(null)

        try {
            await deleteCategory(categoryToDelete.id)
            await loadData()
            showNotice(`Categoria "${name}" excluída.`)
        } catch {
            setError("Não foi possível excluir a categoria.")
        } finally {
            setCategoryToDelete(null)
        }
    }

    return (
        <div className="mx-auto max-w-6xl p-4 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
                        Categorias
                    </h1>
                    <p className="text-sm text-slate-500">
                        {filtered.length} {filtered.length === 1 ? "categoria" : "categorias"}
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 whitespace-nowrap"
                >
                    + Nova categoria
                </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input
                    type="search"
                    placeholder="Buscar categoria"
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm"
                />
                {search && (
                    <button
                        onClick={() => handleSearch("")}
                        className="text-sm text-brand-600 hover:underline"
                    >
                        Limpar busca
                    </button>
                )}
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {filtered.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                    {categories.length === 0
                        ? "Nenhuma categoria cadastrada. Crie a primeira em \"+ Nova categoria\"."
                        : "Nenhuma categoria encontrada."}
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3 font-medium">Categoria</th>
                                <th className="px-4 py-3 font-medium">Produtos</th>
                                <th className="px-4 py-3 text-right font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visibleCategories.map((category) => {
                                const count = productCounts[category.id] ?? 0

                                return (
                                    <tr key={category.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            {category.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {count > 0 ? (
                                                <Link
                                                    to={`/products?category_id=${category.id}`}
                                                    className="text-brand-600 hover:underline"
                                                >
                                                    {count} {count === 1 ? "produto" : "produtos"}
                                                </Link>
                                            ) : (
                                                <span className="text-slate-400">Nenhum produto</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-4 text-sm font-medium">
                                                <button
                                                    onClick={() => openEdit(category)}
                                                    className="text-brand-600 hover:text-brand-700"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => requestDelete(category)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />

            <CategoryFormModal
                open={showForm}
                category={editingCategory}
                onClose={() => setShowForm(false)}
                onSaved={handleSaved}
            />

            <ConfirmDialog
                open={categoryToDelete !== null}
                title="Excluir categoria"
                message={`Tem certeza que deseja excluir "${categoryToDelete?.name}"? Ela não tem produtos. Esta ação não pode ser desfeita.`}
                onConfirm={handleDelete}
                onCancel={() => setCategoryToDelete(null)}
            />

            <Notice message={notice} />
        </div>
    )
}