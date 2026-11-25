import { useState, type FormEvent } from "react"
import { createPortal } from "react-dom"
import axios from "axios"

import { useStore } from "../context/storeContext"
import type { StoreSettings } from "../types"
import { Modal } from "./Modal"

interface NewStoreModalProps {
    open: boolean
    onClose: () => void
    onCreated: (store: StoreSettings) => void
}

export function NewStoreModal({ open, onClose, onCreated }: NewStoreModalProps) {
    const { createStore, plan } = useStore()
    const [name, setName] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)
        setSaving(true)

        try {
            const created = await createStore(name.trim())

            setName("")
            onCreated(created)
        } catch (err) {
            const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null

            setError(
                typeof detail === "string" && detail.startsWith("Your plan")
                    ? `Seu plano permite até ${plan?.max_stores ?? ""} lojas.`
                    : "Não foi possível criar a loja. Tente novamente.",
            )
        } finally {
            setSaving(false)
        }
    }

    // rendered in the page body so the header and the bottom bar never cover it
    return createPortal(
        <Modal open={open} title="Nova loja" onClose={onClose} widthClass="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-slate-500">
                    Cada loja tem os próprios produtos, estoque, vendas, clientes e resultado. Depois
                    você escolhe a logo e as cores.
                </p>

                <div>
                    <label htmlFor="new-store-name" className="ui-label">
                        Nome da loja
                    </label>
                    <input
                        id="new-store-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={100}
                        autoFocus
                        required
                        className="ui-input w-full"
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn btn-ghost">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving || name.trim() === ""}
                        className="btn btn-primary"
                    >
                        {saving ? "Criando..." : "Criar loja"}
                    </button>
                </div>
            </form>
        </Modal>,
        document.body,
    )
}
