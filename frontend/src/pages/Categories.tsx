import { useEffect, useState, type FormEvent } from "react";
import {
    createCategory,
    deleteCategory,
    getCategories,
    updateCategory,
} from "../api/categories"
import type { Category } from "../types";
import { Link } from "react-router-dom"

export function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [newName, setNewName] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editingName, setEditingName] = useState("")

    async function loadCategories() {
        try {
            const data = await getCategories()
            setCategories(data)
        } catch {
            setError("Não foi possível carregar as categorias")
        }
    }

    useEffect(() => {
        loadCategories()
    }, [])

    async function handleCreate(event: FormEvent) {
        event.preventDefault()
        setError(null)

        try {
            await createCategory(newName)
            setNewName("")
            await loadCategories()
        } catch {
            setError("Não foi possível criar a categoria")
        }
    }

    async function handleDelete(id: number) {
        setError(null)

        try {
            await deleteCategory(id)
            await loadCategories()
        } catch {
            setError("Não foi possível excluir. Verifique se não há produtos vinculados a essa categoria.")
        }
    }

    function startEditing(category: Category) {
        setEditingId(category.id)
        setEditingName(category.name)
    }

    async function handleUpdate(id: number) {
        setError(null)

        try {
            await updateCategory(id, editingName)
            setEditingId(null)
            await loadCategories()
        } catch {
            setError("Não foi possível atualizar a categoria.")
        }
    }

    return (
        <div className="p-8">
            <h1 className="mb-6 text-2x1 font-bold text-gray-800">Categorias</h1>

            <form onSubmit={handleCreate} className="mb-6 flex max-w-sm gap-2">
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome da categoria"
                    required
                    className="flex-1 rounded border border-gray-300 px-3 py-2"
                />
                <button
                    type="submit"
                    className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                    Adicionar
                </button>
            </form>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <ul className="space-y-2">
                {categories.map((category) => (
                    <li 
                        key={category.id}
                        className="flex items-center justify-between rounded-lg bg-white p-4 shadow"
                    >
                        {editingId === category.id ? (
                            <>
                                <input 
                                    type="text" 
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="mr-2 flex-1 rounded border border-gray-300 px-2 py-1"
                                    />
                                    <div className="flex-gap-2">
                                        <button
                                            onClick={() => handleUpdate(category.id)}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                        >
                                            Salvar
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="text-sm font-medium text-gray-500 hover:text-gray-700"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </>
                        ) : (
                            <>
                                <Link
                                    to={`/products?category_id=${category.id}`}
                                    className="font-medium text-gray-800 hover:text-blue-600 hover:underline"
                                >
                                    {category.name}
                                </Link>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => startEditing(category)}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(category.id)}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                    >   
                                        Excluir
                                    </button>
                                </div>
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}