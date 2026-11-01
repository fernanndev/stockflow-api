import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
    createPackaging,
    deletePackagingImage,
    updatePackaging,
    uploadPackagingImage,
    type PackagingUpdateInput
} from "../api/packagings"
import type { Packaging } from "../types";
import { formatCurrency, formatUnitCost } from "../utils/format";
import { getImageUrl } from "../utils/image";
import { Modal } from "./Modal";

interface PackagingFormModalProps {
    open: boolean
    packaging: Packaging | null
    onClose: () => void
    onSaved: (message: string) => void
}

interface FormState {
    name: string
    quantity: string
    total_cost: string
}

const inputClass = "w-full rounded border border-slate-300 px-3 py-2 text-sm"
const labelClass = "mb-1 block text-sm font-medium text-slate-700"

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

function currentTotal(packaging: Packaging): string {
    return (packaging.stock_quantity * packaging.unit_cost).toFixed(2)
}

function buildInitialState(packaging: Packaging | null): FormState {
    if (packaging) {
        return {
            name: packaging.name,
            quantity: String(packaging.stock_quantity),
            total_cost: currentTotal(packaging),
        }
    }

    return { name: "", quantity: "", total_cost: "" }
}

export function PackagingFormModal({
    open,
    packaging,
    onClose,
    onSaved,
}: PackagingFormModalProps) {
    const [form, setForm] = useState<FormState>(() => buildInitialState(packaging))
    const [step, setStep] = useState<"form" | "confirm">("form")
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const [imageFile, setImageFile] = useState<File | null>(null)
    const [removeImage, setRemoveImage] = useState(false)

    const previewUrl = useMemo(
        () => (imageFile ? URL.createObjectURL(imageFile): null),
        [imageFile],
    )

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    const showImage = 
        previewUrl ?? (removeImage ? null : getImageUrl(packaging?.image_url ?? null))

    useEffect(() => {
        if (open) {
            setForm(buildInitialState(packaging))
            setStep("form")
            setError(null)
            setSaving(false)
            setImageFile(null)
            setRemoveImage(false)
        }
    }, [open, packaging])

    const quantity = Number(form.quantity)
    const totalCost = Number(form.total_cost)
    const hasValues = form.quantity !== "" && form.total_cost !== ""
    const unitCost =
        hasValues && quantity > 0 ? Number((totalCost / quantity).toFixed(4)) : null

    const quantityChanged = packaging !== null && quantity !== packaging.stock_quantity
    const totalChanged = packaging !== null && form.total_cost !== currentTotal(packaging)

    function buildSummary(): string | null {
        if (!packaging) {
            if (unitCost === null) return null
            return `${quantity} embalagens por ${formatCurrency(totalCost)} = ${formatUnitCost(unitCost)} cada.`
        }

        if (totalChanged && unitCost !== null) {
            return `Estoque de ${quantity} unidades por ${formatCurrency(totalCost)} = ${formatUnitCost(unitCost)} cada.`
        }
        
        if (quantityChanged) {
            return `O estoque vai passar de ${packaging.stock_quantity} para ${quantity} unidades. O custo por unidade continua o mesmo`
        }

        return null
    }

    const summary = buildSummary()

    function validate(): string | null {
        if (!packaging && (form.quantity === "") !== (form.total_cost === "")) {
            return "Informe a quantidade e o total pago, ou deixe os dois em branco."
        }

        if (packaging && totalChanged && quantity <= 0) {
            return "Para alterar o total pago, a quantidade em estoque precisa ser maior que zero."
        }

        return null
    }

    function handleFileChange(file: File | null) {
        setError(null)

        if (!file) {
            setImageFile(null)
            return
        }

        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError("Use uma imagem JPEG, PNG ou WebP.")
            return
        }

        if (file.size > MAX_IMAGE_SIZE) {
            setError("A imagem deve ter no máximo 5 MB.")
            return
        }

        setImageFile(file)
        setRemoveImage(false)
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault()

        const validationError = validate()
        if (validationError) {
            setError(validationError)
            return
        }

        setError(null)

        if (summary) {
            setStep("confirm")
            return
        }

        save()
    }

    async function save() {
        setSaving(true)
        setError(null)

        let saved: Packaging

        try {
            if (packaging) {
                const payload: PackagingUpdateInput = { name: form.name }
                if (quantityChanged) payload.stock_quantity = quantity
                if (totalChanged && unitCost !== null) payload.unit_cost = unitCost

                saved = await updatePackaging(packaging.id, payload)
            } else {
                saved = await createPackaging({
                    name: form.name,
                    quantity: hasValues ? quantity : null,
                    total_cost: hasValues ? totalCost : null,
                })
            }
        } catch {
            setError(
                packaging
                    ? "Não foi possível atualizar a embalagem."
                    : "Não foi possível criar a embalagem. Verifique se já existe uma com esse nome.",
            )
            setStep("form")
            setSaving(false)
            return
        }

        let message = packaging ? "Embalagem atualizada." : "Embalagem criada."

        try {
            if (imageFile) {
                await uploadPackagingImage(saved.id, imageFile)
            } else if (removeImage && packaging?.image_url) {
                await deletePackagingImage(saved.id)
            }
        } catch {
            message += " Mas não foi possível enviar a foto."
        }

        onSaved(message)
    }

    return (
        <Modal
            open={open}
            title={packaging ? "Editar embalagem" : "Nova embalagem"}
            onClose={onClose}
            widthClass="max-w-lg"
        >
            {step === "confirm" ? (
                <div className="space-y-4">
                    <p className="text-sm text-slate-700">Confira os valores antes de salvar:</p>
                    <p className="rounded bg-slate-50 p-3 text-sm font-medium text-slate-900">
                        {summary}
                    </p>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setStep("form")}
                            disabled={saving}
                            className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                        >
                            Voltar
                        </button>
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className="rounded bg-brand-600  px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            Confirmar e salvar
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className={labelClass}>Nome</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            autoFocus
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>
                            {packaging ? "Quantidade em estoque" : "Quantidade comprada (opcional)"}
                        </label>
                        <input
                            type="number"
                            min={packaging ? 0 : 1}
                            step="1"
                            placeholder="0"
                            value={form.quantity}
                            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                            required={packaging !== null}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>
                            {packaging ? "Total pago pelo estoque (R$)" : "Total pago (R$) (opcional)"}
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={form.total_cost}
                            onChange={(e) => setForm({ ...form, total_cost: e.target.value })}
                            required={packaging !== null}
                            className={inputClass}
                        />
                    </div>

                    <p className="text-sm text-slate-600 sm:col-span-2">
                        {unitCost !== null ? (
                            <>
                                Custo por unidade: {" "}
                                <strong className="text-slate-900">{formatUnitCost(unitCost)}</strong>
                            </>
                        ): (
                            "Informe a quantidade e o total para ver o custo por unidade"
                        )}
                    </p>

                    {packaging && (
                        <p className="text-xs text-slate-500 sm:col-span-2">
                            Para corrigir um valor digitado errado, ajuste a quantidade ou o total. O custo por unidade é recalculado.
                        </p>
                    )}

                    <div className="sm:col-span-2">
                        <label className={labelClass}>Foto (opcional)</label>
                        <div className="flex items-center gap-4">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 text-xs text-slate-400">
                                {showImage ? (
                                    <img
                                        src={showImage}
                                        alt="Pré-visualização"
                                        className="h-full w-full object-cover"
                                    />
                                ): (
                                    "Sem foto"
                                )}
                            </div>
                            <div className="space-y-2">
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                                    className="block text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1,5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                                />
                                {packaging?.image_url && !removeImage && !imageFile &&(
                                    <button
                                        type="button"
                                        onClick={() => setRemoveImage(true)}
                                        className="text-sm text-red-600 hover:underline"
                                    >
                                        Remover foto atual
                                    </button>
                                )}
                                {removeImage && (
                                    <p className="text-xs text-slate-500">
                                        A foto será removida ao salvar.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

                    <div className="flex justify-end gap-3 sm:col-span2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            {packaging ? "Salvar alterações" : "Adicionar embalagem"}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    )
}