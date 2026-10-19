import { useEffect, useState, type FormEvent } from "react"
import { createCategory, updateCategory } from "../api/categories"
import type { Category } from "../types"
import { Modal } from "./Modal"

interface CategoryFormModalProps {
    open: boolean
    category: Category | null
    onClose: () => void
    onSaved: (message: string) => void
}

export function CategoryFormModal({ open, category, onClose, onSaved }: CategoryFormModalProps) {
    const [name, setName] = useState("")
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setName(category?.name ?? "")
            setError(null)
        }
    }, [open, category])

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)

        try {
            if (category) {
                await updateCategory(category.id, name)
                onSaved("Categoria atualizada.")
            } else {
                await createCategory(name)
                onSaved("Categoria criada.")
            }
        } catch {
            setError(
                category
                    ? "Não foi possível atualizar a categoria."
                    : "Não foi possível criar a categoria. Verifique se já existe uma com esse nome.",
            )
        }
    }

    return (
        <Modal
            open={open}
            title={category ? "Editar categoria" : "Nova categoria"}
            onClose={onClose}
            widthClass="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoFocus
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                    >
                        {category ? "Salvar alterações" : "Adicionar categoria"}
                    </button>
                </div>
            </form>
        </Modal>
    )
}