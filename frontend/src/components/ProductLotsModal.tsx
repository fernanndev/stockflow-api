import { useState, type FormEvent } from "react"

import {
    createVariation,
    deleteVariation,
    updateLot,
    updateVariation,
} from "../api/variations"

import type { Lot, Product, Variation } from "../types"
import { formatDate } from "../utils/date"

import { ConfirmDialog } from "./ConfirmDialog"
import { ExpirationBadge } from "./ExpirationBadge"
import { Modal } from "./Modal"

interface ProductLotsModalProps {
    product: Product
    onClose: () => void
    onChanged: (message: string) => Promise<void>
}

const inputClass = "rounded border border-slate-300 px-3 py-2 text-sm"
const smallButtonClass = "text-sm font-medium"

// lots that still have stock, earliest expiration first, no expiration last
function availableLots(variation: Variation): Lot[] {
    return variation.lots
        .filter((lot) => lot.quantity > 0)
        .sort((a, b) => {
            if (a.expiration_date === b.expiration_date) return 0
            if (a.expiration_date === null) return 1
            if (b.expiration_date === null) return -1
            return a.expiration_date.localeCompare(b.expiration_date)
        })
}

export function ProductLotsModal({ product, onClose, onChanged }: ProductLotsModalProps) {
    const [error, setError] = useState<string | null>(null)

    const [newName, setNewName] = useState("")

    const [renamingId, setRenamingId] = useState<number | null>(null)
    const [renameValue, setRenameValue] = useState("")

    const [variationToDelete, setVariationToDelete] = useState<Variation | null>(null)

    const [editingLot, setEditingLot] = useState<Lot | null>(null)
    const [lotDate, setLotDate] = useState("")
    const [lotQuantity, setLotQuantity] = useState("")
    const [confirmingLot, setConfirmingLot] = useState(false)

    async function handleCreate(event: FormEvent) {
        event.preventDefault()
        setError(null)

        const name = newName.trim()

        if (!name) {
            setError("Informe o nome da variação.")
            return
        }

        try {
            await createVariation(product.id, name)
            setNewName("")
            await onChanged(`Variação "${name}" criada.`)
        } catch {
            setError("Não foi possível criar a variação. Verifique se já existe uma com esse nome.")
        }
    }

    function startRename(variation: Variation) {
        setError(null)
        setRenamingId(variation.id)
        setRenameValue(variation.name)
    }

    async function handleRename(event: FormEvent, variation: Variation) {
        event.preventDefault()
        setError(null)

        const name = renameValue.trim()

        if (!name) {
            setError("Informe o nome da variação.")
            return
        }

        try {
            await updateVariation(variation.id, name)
            setRenamingId(null)
            await onChanged(`Variação renomeada para "${name}".`)
        } catch {
            setError("Não foi possível renomear. Verifique se já existe uma variação com esse nome.")
        }
    }

    async function handleDelete() {
        if (!variationToDelete) return

        const name = variationToDelete.name
        setError(null)

        try {
            await deleteVariation(variationToDelete.id)
            await onChanged(`Variação "${name}" excluída.`)
        } catch {
            setError(
                `Não foi possível excluir "${name}". Ela precisa estar sem estoque e sem histórico de movimentações.`,
            )
        } finally {
            setVariationToDelete(null)
        }
    }

    function startEditLot(lot: Lot) {
        setError(null)
        setEditingLot(lot)
        setLotDate(lot.expiration_date ?? "")
        setLotQuantity(String(lot.quantity))
        setConfirmingLot(false)
    }

    function cancelEditLot() {
        setEditingLot(null)
        setConfirmingLot(false)
    }

    async function saveLot(lot: Lot, quantity: number) {
        try {
            await updateLot(lot.id, { expiration_date: lotDate || null, quantity })
            setEditingLot(null)
            setConfirmingLot(false)
            await onChanged("Lote corrigido.")
        } catch {
            setError("Não foi possível corrigir o lote.")
        }
    }

    async function handleLotSubmit(event: FormEvent, lot: Lot) {
        event.preventDefault()
        setError(null)

        const quantity = Number(lotQuantity)

        if (lotQuantity === "" || !Number.isInteger(quantity) || quantity < 0) {
            setError("Informe uma quantidade inteira, zero ou maior.")
            return
        }

        // a changed quantity must be confirmed before it is saved
        if (quantity !== lot.quantity && !confirmingLot) {
            setConfirmingLot(true)
            return
        }

        await saveLot(lot, quantity)
    }

    return (
        <Modal open title={`Lotes: ${product.name}`} onClose={onClose}>
            <p className="mb-4 text-sm text-slate-500">
                Cada compra com validade diferente vira um lote. Use variações só para versões
                diferentes do produto (sabor, cor, tamanho).
            </p>

            <p className="mb-4 text-sm text-slate-600">
                Estoque total: <span className="font-medium">{product.stock_quantity}</span>
            </p>

            <div className="space-y-4">
                {product.variations.map((variation) => {
                    const lots = availableLots(variation)

                    return (
                        <section
                            key={variation.id}
                            className="rounded-lg border border-slate-200 p-3 sm:p-4"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                {renamingId === variation.id ? (
                                    <form
                                        onSubmit={(event) => handleRename(event, variation)}
                                        className="flex flex-1 flex-wrap gap-2"
                                    >
                                        <input
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            maxLength={100}
                                            autoFocus
                                            className={`${inputClass} min-w-0 flex-1`}
                                        />
                                        <button
                                            type="submit"
                                            className={`${smallButtonClass} text-brand-600`}
                                        >
                                            Salvar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRenamingId(null)}
                                            className={`${smallButtonClass} text-slate-500`}
                                        >
                                            Cancelar
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        <p className="font-medium text-slate-900">
                                            {variation.name}
                                            <span className="ml-2 text-sm font-normal text-slate-500">
                                                {variation.stock_quantity} un.
                                            </span>
                                        </p>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => startRename(variation)}
                                                className={`${smallButtonClass} text-brand-600 hover:text-brand-700`}
                                            >
                                                Renomear
                                            </button>
                                            {product.variations.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setVariationToDelete(variation)}
                                                    className={`${smallButtonClass} text-red-600 hover:text-red-800`}
                                                >
                                                    Excluir
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {lots.length === 0 ? (
                                <p className="mt-3 text-sm text-slate-400">Sem estoque.</p>
                            ) : (
                                <ul className="mt-3 divide-y divide-slate-100">
                                    {lots.map((lot) => (
                                        <li key={lot.id} className="py-2">
                                            {editingLot?.id === lot.id ? (
                                                confirmingLot ? (
                                                    <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-900">
                                                        <p>
                                                            Quantidade atual{" "}
                                                            <strong>{lot.quantity}</strong> →{" "}
                                                            <strong>{Number(lotQuantity)}</strong>.
                                                            Confirmar?
                                                        </p>
                                                        <p className="mt-1 text-xs">
                                                            Isso só corrige o número. Não registra
                                                            entrada nem saída no histórico.
                                                        </p>
                                                        <div className="mt-3 flex justify-end gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => setConfirmingLot(false)}
                                                                className={`${smallButtonClass} text-slate-600`}
                                                            >
                                                                Voltar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    saveLot(lot, Number(lotQuantity))
                                                                }
                                                                className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                                                            >
                                                                Confirmar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <form
                                                        onSubmit={(event) =>
                                                            handleLotSubmit(event, lot)
                                                        }
                                                        className="space-y-3"
                                                    >
                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                            <div>
                                                                <label className="mb-1 block text-xs font-medium text-slate-600">
                                                                    Validade
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    value={lotDate}
                                                                    onChange={(e) =>
                                                                        setLotDate(e.target.value)
                                                                    }
                                                                    className={`${inputClass} w-full`}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="mb-1 block text-xs font-medium text-slate-600">
                                                                    Quantidade
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    value={lotQuantity}
                                                                    onChange={(e) =>
                                                                        setLotQuantity(e.target.value)
                                                                    }
                                                                    className={`${inputClass} w-full`}
                                                                />
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            Se já existir um lote com essa validade,
                                                            os dois serão unidos.
                                                        </p>
                                                        <div className="flex justify-end gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={cancelEditLot}
                                                                className={`${smallButtonClass} text-slate-600`}
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                type="submit"
                                                                className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                                                            >
                                                                Salvar
                                                            </button>
                                                        </div>
                                                    </form>
                                                )
                                            ) : (
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-sm text-slate-700">
                                                        {lot.expiration_date ? (
                                                            <>
                                                                Vence em {formatDate(lot.expiration_date)}
                                                                <ExpirationBadge
                                                                    isoDate={lot.expiration_date}
                                                                />
                                                            </>
                                                        ) : (
                                                            "Sem validade"
                                                        )}
                                                    </p>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm font-medium text-slate-900">
                                                            {lot.quantity} un.
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditLot(lot)}
                                                            className={`${smallButtonClass} text-brand-600 hover:text-brand-700`}
                                                        >
                                                            Corrigir
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )
                })}
            </div>

            <form onSubmit={handleCreate} className="mt-4 flex flex-wrap gap-2">
                <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nova variação (ex.: Chocolate)"
                    maxLength={100}
                    className={`${inputClass} min-w-0 flex-1`}
                />
                <button
                    type="submit"
                    className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                    Adicionar
                </button>
            </form>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <ConfirmDialog
                open={variationToDelete !== null}
                title="Excluir variação"
                message={`Excluir a variação "${variationToDelete?.name}"? Só é possível se ela estiver sem estoque e sem histórico.`}
                onConfirm={handleDelete}
                onCancel={() => setVariationToDelete(null)}
            />
        </Modal>
    )
}