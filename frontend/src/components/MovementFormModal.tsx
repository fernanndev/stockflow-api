import { useEffect, useState, type FormEvent } from "react"
import { createStockMovement } from "../api/stockMovements"
import type { Product } from "../types"
import { formatDate } from "../utils/date"
import { Modal } from "./Modal"

interface MovementFormModalProps {
    open: boolean
    products: Product[]
    defaultProductId: number
    onClose: () => void
    onSaved: (message: string) => void
}

type MovementType = "in" | "out"

type ExitReason = "expired" | "loss" | "other"

const REASON_OPTIONS: { value: ExitReason; label: string }[] = [
    { value: "expired", label: "Produto vencido" },
    { value: "loss", label: "Perda ou quebra" },
    { value: "other", label: "Outro" },
]

const inputClass = "ui-input w-full"
const labelClass = "ui-label"

const TYPE_OPTIONS: { value: MovementType; label: string; activeClass: string }[] = [
    {
        value: "in",
        label: "Entrada",
        activeClass: "border-emerald-600 bg-emerald-50 text-emerald-700",
    },
    {
        value: "out",
        label: "Saída",
        activeClass: "border-red-600 bg-red-50 text-red-700",
    },
]

export function MovementFormModal({
    open,
    products,
    defaultProductId,
    onClose,
    onSaved,
}: MovementFormModalProps) {
    const [productId, setProductId] = useState(defaultProductId)
    // 0 = not chosen yet (only matters when the product has several variations)
    const [variationId, setVariationId] = useState(0)
    // 0 = automatic (the backend takes the lot that expires first)
    const [lotId, setLotId] = useState(0)
    const [type, setType] = useState<MovementType>("in")
    const [quantity, setQuantity] = useState("")
    const [expirationDate, setExpirationDate] = useState("")
    const [reason, setReason] = useState<ExitReason | "">("")
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setProductId(defaultProductId)
            setVariationId(0)
            setLotId(0)
            setType("in")
            setQuantity("")
            setExpirationDate("")
            setReason("")
            setError(null)
        }
    }, [open, defaultProductId])

    const selectedProduct = products.find((product) => product.id === productId)
    const variations = selectedProduct?.variations ?? []
    const selectedVariation =
        variations.length === 1
            ? variations[0]
            : variations.find((variation) => variation.id === variationId)

    // lots that still have stock, earliest expiration first, no expiration last
    const availableLots = (selectedVariation?.lots ?? [])
        .filter((lot) => lot.quantity > 0)
        .sort((a, b) => {
            if (a.expiration_date === b.expiration_date) return 0
            if (a.expiration_date === null) return 1
            if (b.expiration_date === null) return -1
            return a.expiration_date.localeCompare(b.expiration_date)
        })
    const selectedLot = availableLots.find((lot) => lot.id === lotId)

    function handleProductChange(newProductId: number) {
        setProductId(newProductId)
        setVariationId(0)
        setLotId(0)
    }

    function handleVariationChange(newVariationId: number) {
        setVariationId(newVariationId)
        setLotId(0)
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)

        const amount = Number(quantity)

        if (!selectedProduct) {
            setError("Selecione um produto.")
            return
        }

        if (!selectedVariation) {
            setError("Selecione a variação.")
            return
        }

        if (!Number.isInteger(amount) || amount < 1) {
            setError("Informe uma quantidade inteira maior que zero.")
            return
        }

        if (type === "out" && !reason) {
            setError("Informe o motivo da saída.")
            return
        }

        if (type === "out") {
            const available = selectedLot ? selectedLot.quantity : selectedVariation.stock_quantity

            if (amount > available) {
                setError(
                    `Saldo insuficiente: ${selectedLot ? "esse lote" : `"${selectedVariation.name}"`} tem ${available} em estoque.`,
                )
                return
            }
        }

        try {
            await createStockMovement({
                product_id: selectedProduct.id,
                variation_id: selectedVariation.id,
                type,
                quantity: amount,
                ...(type === "in" && expirationDate ? { expiration_date: expirationDate } : {}),
                ...(type === "out" && selectedLot ? { lot_id: selectedLot.id } : {}),
                ...(type === "out" && reason ? { reason } : {}),
            })
            onSaved(
                `${type === "in" ? "Entrada" : "Saída"} de ${amount} un. registrada: ${selectedProduct.name}.`,
            )
        } catch {
            setError("Não foi possível registrar a movimentação.")
        }
    }

    return (
        <Modal
            open={open}
            title="Registrar movimentação"
            onClose={onClose}
            widthClass="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={labelClass}>Produto</label>
                    <select
                        value={productId}
                        onChange={(e) => handleProductChange(Number(e.target.value))}
                        required
                        className={inputClass}
                    >
                        <option value={0} disabled>
                            Selecione
                        </option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                                {product.size ? ` (${product.size})` : ""}
                            </option>
                        ))}
                    </select>
                    {selectedProduct && (
                        <p className="mt-1 text-xs text-slate-500">
                            Estoque atual: {selectedProduct.stock_quantity}
                        </p>
                    )}
                </div>

                {variations.length > 1 && (
                    <div>
                        <label className={labelClass}>Variação</label>
                        <select
                            value={variationId}
                            onChange={(e) => handleVariationChange(Number(e.target.value))}
                            required
                            className={inputClass}
                        >
                            <option value={0} disabled>
                                Selecione
                            </option>
                            {variations.map((variation) => (
                                <option key={variation.id} value={variation.id}>
                                    {variation.name} ({variation.stock_quantity} un.)
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className={labelClass}>Tipo</label>
                    <div className="grid grid-cols-2 gap-2">
                        {TYPE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setType(option.value)}
                                className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition sm:min-h-10 ${
                                    type === option.value
                                        ? option.activeClass
                                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Quantidade</label>
                    <input
                        type="number"
                        min={1}
                        placeholder="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                        className={inputClass}
                    />
                </div>

                {type === "in" && (
                    <div>
                        <label className={labelClass}>Validade (opcional)</label>
                        <input
                            type="date"
                            value={expirationDate}
                            onChange={(e) => setExpirationDate(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                )}

                {type === "out" && (
                    <div>
                        <label className={labelClass}>Movito da saída</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value as ExitReason)}
                            required
                            className={inputClass}
                        >
                            <option value="" disabled>
                                Selecione
                            </option>
                            {REASON_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                            Vendas e brindes serão registrados na tela de Vendas.
                        </p>
                    </div>
                )}

                {type === "out" && availableLots.length > 0 && (
                    <div>
                        <label className={labelClass}>De onde tirar</label>
                        <select
                            value={lotId}
                            onChange={(e) => setLotId(Number(e.target.value))}
                            className={inputClass}
                        >
                            <option value={0}>Automático (vence primeiro)</option>
                            {availableLots.map((lot) => (
                                <option key={lot.id} value={lot.id}>
                                    {lot.expiration_date
                                        ? `Vence em ${formatDate(lot.expiration_date)}`
                                        : "Sem validade"}{" "}
                                    ({lot.quantity} un.)
                                </option>
                            ))}
                        </select>
                    </div>
                )}

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
                        Registrar
                    </button>
                </div>
            </form>
        </Modal>
    )
}