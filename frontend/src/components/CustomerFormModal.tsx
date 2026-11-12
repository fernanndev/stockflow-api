import { isAxiosError } from "axios"
import { useEffect, useState, type FormEvent } from "react"
import { createCustomer, updateCustomer } from "../api/customers"
import type { Customer } from "../types"
import { formatPhone } from "../utils/sales"
import { Modal } from "./Modal"

interface CustomerFormModalProps {
    open: boolean
    customer: Customer | null
    onClose: () => void
    onSaved: (message: string) => void
}

interface FormState {
    name: string
    phone: string
    notes: string
}

const inputClass = "ui-input w-full"
const labelClass = "ui-label"

function buildInitialState(customer: Customer | null): FormState {
    if (customer) {
        return {
            name: customer.name,
            phone: customer.phone ? formatPhone(customer.phone) : "",
            notes: customer.notes ?? "",
        }
    }

    return { name: "", phone: "", notes: "" }
}

export function CustomerFormModal({ open, customer, onClose, onSaved }: CustomerFormModalProps) {
    const [form, setForm] = useState<FormState>(() => buildInitialState(customer))
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) {
            setForm(buildInitialState(customer))
            setError(null)
            setSaving(false)
        }
    }, [open, customer])

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)

        const phoneDigits = form.phone.replace(/\D/g, "")

        if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 13)) {
            setError("Telefone inválido. Use DDD + número, por exemplo (11) 91234-5678.")
            return
        }

        const payload = {
            name: form.name.trim(),
            phone: phoneDigits || null,
            notes: form.notes.trim() || null,
        }

        setSaving(true)

        try {
            if (customer) {
                await updateCustomer(customer.id, payload)
            } else {
                await createCustomer(payload)
            }

            onSaved(customer ? "Cliente atualizado." : "Cliente cadastrado.")
        } catch (e) {
            // 400 = duplicated (same phone, or same name when there is no phone)
            setError(
                isAxiosError(e) && e.response?.status === 400
                    ? "Já existe um cliente com esse telefone (ou com esse nome, se não houver telefone)."
                    : "Não foi possível salvar o cliente.",
            )
            setSaving(false)
        }
    }

    return (
        <Modal
            open={open}
            title={customer ? "Editar cliente" : "Novo cliente"}
            onClose={onClose}
            widthClass="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={labelClass}>Nome</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        autoFocus
                        maxLength={150}
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className={labelClass}>Telefone (WhatsApp)</label>
                    <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="(11) 91234-5678"
                        className={inputClass}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Opcional, mas ajuda a diferenciar clientes com o mesmo nome e a cobrar pelo
                        WhatsApp.
                    </p>
                </div>

                <div>
                    <label className={labelClass}>Observações (opcional)</label>
                    <textarea
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        rows={3}
                        maxLength={500}
                        className={inputClass}
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn btn-ghost">
                        Cancelar
                    </button>
                    <button type="submit" disabled={saving} className="btn btn-primary">
                        {customer ? "Salvar alterações" : "Cadastrar cliente"}
                    </button>
                </div>
            </form>
        </Modal>
    )
}