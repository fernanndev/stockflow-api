import { useEffect, useState, type FormEvent } from "react"
import { registerPackagingPurchase } from "../api/packagings"
import type { Packaging } from "../types"
import { formatCurrency, formatUnitCost } from "../utils/format"
import { Modal } from "./Modal"

interface PackagingPurchaseModalProps {
    open: boolean
    packaging: Packaging | null
    onClose: () => void
    onSaved: (message: string) => void
}

const inputClass = "w-full rounded border border-slate-300 px-3 py-2 text-sm"
const labelClass = "mb-1 block text-sm font-medium text-slate-700"

export function PackagingPurchaseModal({
    open,
    packaging,
    onClose,
    onSaved,
}: PackagingPurchaseModalProps) {
    const [quantity, setQuantity] = useState("")
    const [totalCost, setTotalCost] = useState("")
    const [step, setStep] = useState<"form" | "confirm">("form")
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) {
            setQuantity("")
            setTotalCost("")
            setStep("form")
            setError(null)
            setSaving(false)
        }
    }, [open, packaging])

    const quantityNumber = Number(quantity)
    const totalNumber = Number(totalCost)
    const valid = quantityNumber > 0 && totalCost !== "" && totalNumber >= 0

    const purchaseUnitCost = valid ? totalNumber / quantityNumber : 0

    const newStock = packaging ? packaging.stock_quantity + quantityNumber : 0
    const newAverage = 
        packaging && valid
            ? (packaging.stock_quantity * packaging.unit_cost + totalNumber) / newStock
            : null
    
    function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)
        setStep("confirm")
    }

    async function save() {
        if (!packaging) return

        setSaving(true)
        setError(null)

        try {
            await registerPackagingPurchase(packaging.id, {
                quantity: quantityNumber,
                total_cost: totalNumber,
            })
            onSaved("Compra registrada.")
        } catch {
            setError("Não foi possível registrar a compra.")
            setStep("form")
            setSaving(false)
        }
    }

    return (
        <Modal
            open={open}
            title={packaging ? `Registrar compra · ${packaging.name}` : "Registrar compra"}
            onClose={onClose}
            widthClass="max-w-md"
        >
            {step === "confirm" && packaging && purchaseUnitCost !== null && newAverage !== null ? (
                <div className="space-y-4"> 
                    <p className="text-sm text-slate-700">Confica os valores antes de salvar:</p>

                    <div className="space-y-2 rounded bg-slate-50 p-3 text-sm text-slate-900">
                        <p className="font-medium">
                            {quantityNumber} embalagens por {formatCurrency(totalNumber)} = {" "}

                            {formatUnitCost(purchaseUnitCost)} cada.
                        </p>
                        <p>
                            Estoque: {packaging.stock_quantity} → {newStock} unidades
                        </p>
                        <p>
                            Custo médio por unidade: {formatUnitCost(packaging.unit_cost)} →{" "}

                            {formatUnitCost(newAverage)}
                        </p>
                    </div>

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
                            className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            Confirmar compra
                        </button>
                    </div>
                </div>    
            ): (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={labelClass}>Quantidade comprada</label>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="0"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            required
                            autoFocus
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Total pago (R$)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={totalCost}
                            onChange={(e) => setTotalCost(e.target.value)}
                            required
                            className={inputClass}
                        />
                    </div>

                    <p className="text-sm text-slate-600">
                        {purchaseUnitCost !== null ? (
                            <>
                                Custo deste compra por unidade:{" "}
                                <strong className="text-slate-900">
                                    {formatUnitCost(purchaseUnitCost)}
                                </strong>
                            </>
                        ): (
                            "Informe a quantidade e o total para ver o custo por unidade."
                        )}
                    </p>

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
                            Continuar
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    )
}