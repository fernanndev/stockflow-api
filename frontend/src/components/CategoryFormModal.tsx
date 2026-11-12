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
                    <label className="ui-label">Nome</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoFocus
                        className="ui-input w-full"
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-ghost"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                    >
                        {category ? "Salvar alterações" : "Adicionar categoria"}
                    </button>
                </div>
            </form>
        </Modal>
    )
}