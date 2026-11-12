import { useEffect, useRef, useState, type FormEvent } from "react"
import { isAxiosError } from "axios"
import { Link, useNavigate } from "react-router-dom"
import { getPackagings } from "../api/packagings"
import { getProducts } from "../api/products"
import { createSale, getSales } from "../api/sales"
import type { Packaging, PaymentMethod, Product } from "../types"
import { formatCurrency, normalizeText } from "../utils/format"
import { PAYMENT_METHOD_OPTIONS, formatPhone } from "../utils/sales"

interface ItemLine {
    key: number
    product: Product
    variationId: number
    quantity: string
    unitPrice: string
    isGift: boolean
}

interface PackagingLine {
    key: number
    packagingId: number
    quantity: string
}

interface PaymentLine {
    key: number
    method: PaymentMethod
    amount: string
}

interface KnownCustomer {
    name: string
    phone: string | null
}

const inputClass = "ui-input w-full"
const labelClass = "mb-1 block text-xs font-medium text-slate-500"

function toNumber(value: string): number {
    const number = Number(value.replace(",", "."))
    return Number.isFinite(number) ? number : 0
}

function toQuantity(value: string): number {
    return Math.floor(toNumber(value))
}

function toCents(value: number): number {
    return Math.round(value * 100)
}

function defaultVariationId(product: Product): number {
    const withStock = product.variations.find((variation) => variation.stock_quantity > 0)
    return (withStock ?? product.variations[0]).id
}

export function NewSalePage() {
    const navigate = useNavigate()
    const nextKey = useRef(1)

    const [products, setProducts] = useState<Product[]>([])
    const [packagings, setPackagings] = useState<Packaging[]>([])
    const [customers, setCustomers] = useState<KnownCustomer[]>([])
    const [loadError, setLoadError] = useState<string | null>(null)

    const [search, setSearch] = useState("")
    const [items, setItems] = useState<ItemLine[]>([])
    const [usedPackagings, setUsedPackagings] = useState<PackagingLine[]>([])
    const [payments, setPayments] = useState<PaymentLine[]>([])
    const [customerName, setCustomerName] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")

    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const [productList, packagingList, sales] = await Promise.all([
                    getProducts(),
                    getPackagings(),
                    getSales(),
                ])

                setProducts(productList)
                setPackagings(packagingList)

                // sales come newest first: the first time a name shows up is its latest phone
                const known = new Map<string, KnownCustomer>()

                for (const sale of sales.sales) {
                    if (!sale.customer_name) continue

                    const key = sale.customer_name.toLowerCase()
                    const current = known.get(key)

                    if (!current) {
                        known.set(key, { name: sale.customer_name, phone: sale.customer_phone })
                    } else if (!current.phone && sale.customer_phone) {
                        current.phone = sale.customer_phone
                    }
                }

                setCustomers([...known.values()])
            } catch {
                setLoadError("Não foi possível carregar produtos e embalagens.")
            }
        }

        load()
    }, [])

    // ---- totals (calculated on every render, no extra state) ----
    const totalCents = items.reduce(
        (sum, line) =>
            line.isGift ? sum : sum + toCents(toNumber(line.unitPrice)) * toQuantity(line.quantity),
        0,
    )
    const paidCents = payments.reduce((sum, line) => sum + toCents(toNumber(line.amount)), 0)
    const remainingCents = totalCents - paidCents

    const costKnown = items.every((line) => line.product.cost_price !== null)
    const itemsCostCents = items.reduce(
        (sum, line) => sum + toCents(line.product.cost_price ?? 0) * toQuantity(line.quantity),
        0,
    )
    const packagingsCostCents = usedPackagings.reduce((sum, line) => {
        const packaging = packagings.find((p) => p.id === line.packagingId)
        return sum + toCents(packaging?.unit_cost ?? 0) * toQuantity(line.quantity)
    }, 0)
    const costCents = itemsCostCents + packagingsCostCents
    const profitCents = totalCents - costCents

    // ---- products ----
    const matches = search
        ? products
              .filter((product) => normalizeText(product.name).includes(normalizeText(search)))
              .slice(0, 8)
        : []

    function addProduct(product: Product) {
        const variationId = defaultVariationId(product)
        const existing = items.find(
            (line) => line.product.id === product.id && line.variationId === variationId,
        )

        if (existing) {
            updateItem(existing.key, { quantity: String(toQuantity(existing.quantity) + 1) })
        } else {
            setItems((current) => [
                ...current,
                {
                    key: nextKey.current++,
                    product,
                    variationId,
                    quantity: "1",
                    unitPrice: product.price.toFixed(2),
                    isGift: false,
                },
            ])
        }

        setSearch("")
    }

    function updateItem(key: number, patch: Partial<ItemLine>) {
        setItems((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
    }

    function removeItem(key: number) {
        setItems((current) => current.filter((line) => line.key !== key))
    }

    function stockOf(line: ItemLine): number {
        return line.product.variations.find((v) => v.id === line.variationId)?.stock_quantity ?? 0
    }

    // ---- packagings ----
    function addPackaging(packagingId: number) {
        const existing = usedPackagings.find((line) => line.packagingId === packagingId)

        if (existing) {
            updatePackaging(existing.key, String(toQuantity(existing.quantity) + 1))
        } else {
            setUsedPackagings((current) => [
                ...current,
                { key: nextKey.current++, packagingId, quantity: "1" },
            ])
        }
    }

    function updatePackaging(key: number, quantity: string) {
        setUsedPackagings((current) =>
            current.map((line) => (line.key === key ? { ...line, quantity } : line)),
        )
    }

    function removePackaging(key: number) {
        setUsedPackagings((current) => current.filter((line) => line.key !== key))
    }

    // ---- payments ----
    function addPayment() {
        setPayments((current) => [
            ...current,
            {
                key: nextKey.current++,
                method: "pix",
                amount: remainingCents > 0 ? (remainingCents / 100).toFixed(2) : "",
            },
        ])
    }

    function updatePayment(key: number, patch: Partial<PaymentLine>) {
        setPayments((current) =>
            current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
        )
    }

    function removePayment(key: number) {
        setPayments((current) => current.filter((line) => line.key !== key))
    }

    // ---- customer ----
    function handleCustomerName(value: string) {
        setCustomerName(value)

        if (customerPhone) return

        const match = customers.find((c) => c.name.toLowerCase() === value.trim().toLowerCase())

        if (match?.phone) setCustomerPhone(formatPhone(match.phone))
    }

    // ---- submit ----
    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)

        if (items.length === 0) {
            setError("Adicione pelo menos um produto.")
            return
        }

        const stockUsed = new Map<number, number>()

        for (const line of items) {
            const quantity = toQuantity(line.quantity)

            if (quantity <= 0) {
                setError(`Informe a quantidade de "${line.product.name}".`)
                return
            }

            if (toNumber(line.unitPrice) < 0) {
                setError(`O preço de "${line.product.name}" não pode ser negativo.`)
                return
            }

            const used = (stockUsed.get(line.variationId) ?? 0) + quantity
            stockUsed.set(line.variationId, used)

            if (used > stockOf(line)) {
                setError(`Estoque insuficiente de "${line.product.name}".`)
                return
            }
        }

        for (const line of usedPackagings) {
            const packaging = packagings.find((p) => p.id === line.packagingId)

            if (toQuantity(line.quantity) > (packaging?.stock_quantity ?? 0)) {
                setError(`Estoque insuficiente da embalagem "${packaging?.name}".`)
                return
            }
        }

        if (paidCents > totalCents) {
            setError("O total dos pagamentos passa do valor da venda.")
            return
        }

        if (remainingCents > 0 && !customerName.trim()) {
            setError("Falta pagar uma parte: informe o cliente para registrar como fiado.")
            return
        }

        const phoneDigits = customerPhone.replace(/\D/g, "")

        if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 13)) {
            setError("Telefone inválido. Use DDD + número, por exemplo (11) 91234-5678.")
            return
        }

        setSaving(true)

        try {
            await createSale({
                customer_name: customerName.trim() || null,
                customer_phone: phoneDigits || null,
                items: items.map((line) => ({
                    product_id: line.product.id,
                    variation_id: line.variationId,
                    quantity: toQuantity(line.quantity),
                    unit_price: toNumber(line.unitPrice),
                    is_gift: line.isGift,
                })),
                packagings: usedPackagings
                    .filter((line) => toQuantity(line.quantity) > 0)
                    .map((line) => ({
                        packaging_id: line.packagingId,
                        quantity: toQuantity(line.quantity),
                    })),
                payments: payments
                    .filter((line) => toNumber(line.amount) > 0)
                    .map((line) => ({ amount: toNumber(line.amount), method: line.method })),
            })

            navigate("/sales")
        } catch (e) {
            const detail =
                isAxiosError(e) && typeof e.response?.data?.detail === "string"
                    ? ` (${e.response.data.detail})`
                    : ""

            setError(`Não foi possível registrar a venda.${detail}`)
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex items-center justify-between gap-3">
                <h1 className="page-title">Nova venda</h1>
                <Link to="/sales" className="text-sm font-medium text-slate-600 hover:underline">
                    Voltar
                </Link>
            </div>

            {loadError && <p className="mb-4 text-sm text-red-600">{loadError}</p>}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {/* Items */}
                    <section>
                        <h2 className="mb-3 text-sm font-semibold text-slate-900">Produtos</h2>

                        <input
                            type="search"
                            placeholder="Buscar produto para adicionar"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={inputClass}
                        />

                        {search && (
                            <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                {matches.length === 0 && (
                                    <li className="px-3 py-2 text-sm text-slate-500">
                                        Nenhum produto encontrado.
                                    </li>
                                )}
                                {matches.map((product) => (
                                    <li key={product.id}>
                                        <button
                                            type="button"
                                            disabled={product.stock_quantity <= 0}
                                            onClick={() => addProduct(product)}
                                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <span className="min-w-0 truncate font-medium text-slate-900">
                                                {product.name}
                                            </span>
                                            <span className="shrink-0 text-xs text-slate-500">
                                                {product.stock_quantity > 0
                                                    ? `${product.stock_quantity} em estoque · ${formatCurrency(product.price)}`
                                                    : "sem estoque"}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {items.length === 0 ? (
                            <p className="empty-state mt-3 p-6">
                                Busque um produto acima para começar a venda.
                            </p>
                        ) : (
                            <ul className="mt-3 space-y-3">
                                {items.map((line) => {
                                    const stock = stockOf(line)
                                    const lineTotal = line.isGift
                                        ? 0
                                        : (toCents(toNumber(line.unitPrice)) *
                                              toQuantity(line.quantity)) /
                                          100

                                    return (
                                        <li
                                            key={line.key}
                                            className="card p-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-medium text-slate-900">
                                                        {line.product.name}
                                                    </p>
                                                    {line.product.variations.length > 1 ? (
                                                        <select
                                                            value={line.variationId}
                                                            onChange={(e) =>
                                                                updateItem(line.key, {
                                                                    variationId: Number(e.target.value),
                                                                })
                                                            }
                                                            className="ui-input mt-1 px-2"
                                                        >
                                                            {line.product.variations.map((variation) => (
                                                                <option
                                                                    key={variation.id}
                                                                    value={variation.id}
                                                                >
                                                                    {variation.name} (
                                                                    {variation.stock_quantity})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <p className="text-xs text-slate-500">
                                                            {stock} em estoque
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(line.key)}
                                                    className="-my-1 rounded-md px-2 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                                >
                                                    Remover
                                                </button>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
                                                <div>
                                                    <label className={labelClass}>Quantidade</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={line.quantity}
                                                        onChange={(e) =>
                                                            updateItem(line.key, {
                                                                quantity: e.target.value,
                                                            })
                                                        }
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Preço unitário</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={line.unitPrice}
                                                        disabled={line.isGift}
                                                        onChange={(e) =>
                                                            updateItem(line.key, {
                                                                unitPrice: e.target.value,
                                                            })
                                                        }
                                                        className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`}
                                                    />
                                                </div>
                                                <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={line.isGift}
                                                        onChange={(e) =>
                                                            updateItem(line.key, {
                                                                isGift: e.target.checked,
                                                            })
                                                        }
                                                    />
                                                    Brinde
                                                </label>
                                                <p className="pb-2 text-right text-sm font-semibold tabular-nums text-slate-900">
                                                    {formatCurrency(lineTotal)}
                                                </p>
                                            </div>

                                            {toQuantity(line.quantity) > stock && (
                                                <p className="mt-2 text-xs text-red-600">
                                                    Só há {stock} em estoque.
                                                </p>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </section>

                    {/* Packagings */}
                    <section>
                        <h2 className="mb-3 text-sm font-semibold text-slate-900">
                            Embalagens usadas (opcional)
                        </h2>

                        <select
                            value=""
                            onChange={(e) => {
                                if (e.target.value) addPackaging(Number(e.target.value))
                            }}
                            className={inputClass}
                        >
                            <option value="">Adicionar embalagem...</option>
                            {packagings.map((packaging) => (
                                <option
                                    key={packaging.id}
                                    value={packaging.id}
                                    disabled={packaging.stock_quantity <= 0}
                                >
                                    {packaging.name} ({packaging.stock_quantity} em estoque)
                                </option>
                            ))}
                        </select>

                        {usedPackagings.length > 0 && (
                            <ul className="mt-3 space-y-2">
                                {usedPackagings.map((line) => {
                                    const packaging = packagings.find((p) => p.id === line.packagingId)

                                    return (
                                        <li
                                            key={line.key}
                                            className="card flex items-center justify-between gap-3 px-3 py-2"
                                        >
                                            <span className="min-w-0 truncate text-sm text-slate-900">
                                                {packaging?.name}
                                            </span>
                                            <div className="flex shrink-0 items-center gap-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={line.quantity}
                                                    onChange={(e) =>
                                                        updatePackaging(line.key, e.target.value)
                                                    }
                                                    className="ui-input w-20 px-2"
                                                    aria-label="Quantidade de embalagens"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removePackaging(line.key)}
                                                    className="-my-1 rounded-md px-2 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </section>

                    {/* Customer */}
                    <section>
                        <h2 className="mb-3 text-sm font-semibold text-slate-900">
                            Cliente (obrigatório se for fiado)
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelClass}>Nome</label>
                                <input
                                    type="text"
                                    list="known-customers"
                                    value={customerName}
                                    onChange={(e) => handleCustomerName(e.target.value)}
                                    maxLength={150}
                                    className={inputClass}
                                />
                                <datalist id="known-customers">
                                    {customers.map((customer) => (
                                        <option key={customer.name} value={customer.name} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className={labelClass}>Telefone (WhatsApp)</label>
                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="(11) 91234-5678"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Payments */}
                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-700">Pagamento</h2>
                            <button
                                type="button"
                                onClick={addPayment}
                                className="text-sm font-medium text-brand-700 hover:underline"
                            >
                                + Adicionar pagamento
                            </button>
                        </div>

                        {payments.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                                Nenhum pagamento: a venda inteira fica como fiado.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {payments.map((line) => (
                                    <li
                                        key={line.key}
                                        className="grid grid-cols-[1fr_1fr_auto] items-center gap-3"
                                    >
                                        <select
                                            value={line.method}
                                            onChange={(e) =>
                                                updatePayment(line.key, {
                                                    method: e.target.value as PaymentMethod,
                                                })
                                            }
                                            className={inputClass}
                                        >
                                            {PAYMENT_METHOD_OPTIONS.map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={line.amount}
                                            onChange={(e) =>
                                                updatePayment(line.key, { amount: e.target.value })
                                            }
                                            className={inputClass}
                                            aria-label="Valor pago"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePayment(line.key)}
                                            className="-my-1 rounded-md px-2 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                        >
                                            Remover
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                {/* Summary */}
                <aside className="lg:col-span-1">
                    <div className="card space-y-3 p-4 sm:p-5 lg:sticky lg:top-24">
                        <h2 className="text-sm font-semibold text-slate-700">Resumo</h2>

                        <dl className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Total</dt>
                                <dd className="text-lg font-semibold tabular-nums text-slate-900">
                                    {formatCurrency(totalCents / 100)}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Pago</dt>
                                <dd className="font-medium tabular-nums text-slate-900">
                                    {formatCurrency(paidCents / 100)}
                                </dd>
                            </div>
                            {remainingCents > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-slate-500">Falta pagar (fiado)</dt>
                                    <dd className="font-medium tabular-nums text-amber-700">
                                        {formatCurrency(remainingCents / 100)}
                                    </dd>
                                </div>
                            )}
                            {remainingCents < 0 && (
                                <p className="text-red-600">Pagamentos passam do total.</p>
                            )}
                            <div className="flex justify-between border-t border-slate-100 pt-2">
                                <dt className="text-slate-500">Custo</dt>
                                <dd className="tabular-nums text-slate-700">
                                    {costKnown ? formatCurrency(costCents / 100) : "—"}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Lucro</dt>
                                <dd
                                    className={`font-medium tabular-nums ${
                                        !costKnown
                                            ? "text-slate-400"
                                            : profitCents >= 0
                                              ? "text-emerald-700"
                                              : "text-red-700"
                                    }`}
                                >
                                    {costKnown ? formatCurrency(profitCents / 100) : "—"}
                                </dd>
                            </div>
                        </dl>

                        {!costKnown && items.length > 0 && (
                            <p className="text-xs text-slate-500">
                                Algum produto está sem preço de custo, então o lucro não é calculado.
                            </p>
                        )}

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <button
                            type="submit"
                            disabled={saving}
                            className="btn btn-primary w-full py-2.5"
                        >
                            {saving ? "Registrando..." : "Registrar venda"}
                        </button>
                    </div>
                </aside>
            </div>
        </form>
    )
}