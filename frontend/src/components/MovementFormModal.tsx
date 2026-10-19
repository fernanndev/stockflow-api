import { useEffect, useState, type FormEvent } from "react"
import { createStockMovement } from "../api/stockMovements"
import type { Product } from "../types"
import { Modal } from "./Modal"

interface MovementFormModalProps {
    open: boolean
    products: Product[]
    defaultProductId: number
    onClose: () => void
    onSaved: (message: string) => void
}

type MovementType = "in" | "out"

const inputClass = "w-full rounded border border-slate-300 px-3 py-2 text-sm"
const labelClass = "mb-1 block text-sm font-medium text-slate-700"

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
    const [type, setType] = useState<MovementType>("in")
    const [quantity, setQuantity] = useState("")
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setProductId(defaultProductId)
            setType("in")
            setQuantity("")
            setError(null)
        }
    }, [open, defaultProductId])

    const selectedProduct = products.find((product) => product.id === productId)

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)

        const amount = Number(quantity)

        if (!selectedProduct) {
            setError("Selecione um produto.")
            return
        }

        if (!Number.isInteger(amount) || amount < 1) {
            setError("Informe uma quantidade inteira maior que zero.")
            return
        }

        if (type === "out" && amount > selectedProduct.stock_quantity) {
            setError(
                `Saldo insuficiente: "${selectedProduct.name}" tem ${selectedProduct.stock_quantity} em estoque.`,
            )
            return
        }

        try {
            await createStockMovement({
                product_id: selectedProduct.id,
                type,
                quantity: amount,
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
                        onChange={(e) => setProductId(Number(e.target.value))}
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

                <div>
                    <label className={labelClass}>Tipo</label>
                    <div className="grid grid-cols-2 gap-2">
                        {TYPE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setType(option.value)}
                                className={`rounded border px-3 py-2 text-sm font-medium ${
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
                        Registrar
                    </button>
                </div>
            </form>
        </Modal>
    )
}