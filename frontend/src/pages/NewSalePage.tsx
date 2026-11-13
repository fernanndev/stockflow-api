import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { isAxiosError } from "axios"
import { Link, useNavigate } from "react-router-dom"

import { getPackagings } from "../api/packagings"
import { getProducts } from "../api/products"
import { createSale } from "../api/sales"
import { getCustomers } from "../api/customers"

import { Pagination } from "../components/Pagination"
import { SaleProductCard } from "../components/SaleProductCard"
import { CustomerFormModal } from "../components/CustomerFormModal"
import { CustomerPicker } from "../components/CustomerPicker"

import type { Packaging, PaymentMethod, Product, Customer } from "../types"

import { formatCurrency, normalizeText } from "../utils/format"
import { PAYMENT_METHOD_OPTIONS } from "../utils/sales"

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

const PAGE_SIZE = 12

function chipClass(active: boolean): string {
    return `shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
            ? "border-brand-700 bg-brand-700 text-white"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    }`
}

export function NewSalePage() {
    const navigate = useNavigate()
    const nextKey = useRef(1)

    const [products, setProducts] = useState<Product[]>([])
    const [packagings, setPackagings] = useState<Packaging[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loadError, setLoadError] = useState<string | null>(null)

    const [search, setSearch] = useState("")
    const [categoryId, setCategoryId] = useState<number | null>(null)
    const [page, setPage] = useState(1)
    const [items, setItems] = useState<ItemLine[]>([])
    const [usedPackagings, setUsedPackagings] = useState<PackagingLine[]>([])
    const [payments, setPayments] = useState<PaymentLine[]>([])
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [showCustomerForm, setShowCustomerForm] = useState(false)

    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [panelOpen, setPanelOpen] = useState(false)

    const [scanMessage, setScanMessage] = useState<{ ok: boolean; text: string } | null>(null)
    const searchRef = useRef<HTMLInputElement>(null)

    // the scan feedback disappears by itself
    useEffect(() => {
        if (!scanMessage) return

        const timer = setTimeout(() => setScanMessage(null), 3000)
        return () => clearTimeout(timer)
    }, [scanMessage])

    // on a computer the field is ready for the barcode reader; on a phone it would open the keyboard
    useEffect(() => {
        if (window.matchMedia("(min-width: 1024px)").matches) searchRef.current?.focus()
    }, [])

    useEffect(() => {
        async function load() {
            try {
                const [productList, packagingList, customerList] = await Promise.all([
                    getProducts(),
                    getPackagings(),
                    getCustomers(),
                ])

                setProducts(productList)
                setPackagings(packagingList)
                setCustomers(customerList)
            } catch {
                setLoadError("Não foi possível carregar produtos, embalagens e clientes.")
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
   const categories = [
        ...new Map(products.map((p) => [p.category.id, p.category] as const)).values(),
   ].sort((a, b) => a.name.localeCompare(b.name))

   const filteredProducts = products
        .filter((product) => categoryId === null || product.category.id === categoryId)
        .filter(
            (product) =>
                normalizeText(product.name).includes(normalizeText(search)) ||
                product.variations.some((variation) => variation.barcode?.includes(search.trim())),
        )
        // products without stock got to the end
        .sort((a, b) => Number(b.stock_quantity > 0) - Number(a.stock_quantity > 0))

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const visibleProducts = filteredProducts.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    )

    // units of each variation already in the sale (the cards use it to respect the stock)
    const inSale = new Map<number, number>()

    for (const line of items) {
        inSale.set(line.variationId, (inSale.get(line.variationId) ?? 0) + toQuantity(line.quantity))
    }

    function changeSearch(value: string) {
        setSearch(value)
        setPage(1)
    }

    function changeCategory(id: number | null) {
        setCategoryId(id)
        setPage(1)
    }

    function addProduct(product: Product, variationId: number = defaultVariationId(product)) {
        const existing = items.find(
            (line) => line.product.id === product.id && line.variationId === variationId,
        )

        if (existing) {
            updateItem(existing.key, { quantity: String(toQuantity(existing.quantity) + 1) 
            })
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
    }

    // a barcode reader types the code and presses Enter, exactly like typing it by hand
    function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key !== "Enter") return

        // Enter must never finish the sale from this field
        event.preventDefault()

        const code = event.currentTarget.value.trim()

        if (code) scanCode(code)
    }

    function scanCode(code: string) {
        for (const product of products) {
            const variation = product.variations.find((v) => v.barcode === code)

            if (!variation) continue

            const label =
                variation.name === "Padrão" ? product.name : `${product.name} (${variation.name})`
            const free = variation.stock_quantity - (inSale.get(variation.id) ?? 0)

            if (free <= 0) {
                setScanMessage({ ok: false, text: `Sem estoque de ${label}.` })
            } else {
                addProduct(product, variation.id)
                setScanMessage({ ok: true, text: `Adicionado: ${label}` })
            }

            changeSearch("")
            return
        }

        // only digits looks like an unregistered barcode; anything else was just a name search
        if (/^\d{4,}$/.test(code)) {
            setScanMessage({ ok: false, text: `Código ${code} não cadastrado.` })
            changeSearch("")
        }
    }

    function updateItem(key: number, patch: Partial<ItemLine>) {
        setItems((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
    }

    function removeItem(key: number) {
        setItems((current) => current.filter((line) => line.key !== key))
    }

    function changeQuantity(key: number, delta: number) {
        const line = items.find((l) => l.key === key)

        if (!line) return

        updateItem(key, { quantity: String(Math.max(1, toQuantity(line.quantity) + delta)) 
        })
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
    function addPayment(method: PaymentMethod = "pix") {
        setPayments((current) => [
            ...current,
            {
                key: nextKey.current++,
                method,
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
    function handleCustomerSaved(_message: string, created: Customer) {
        setCustomers((current) => [...current, created])
        setCustomer(created)
        setShowCustomerForm(false)
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

        if (remainingCents > 0 && !customer) {
            setError("Falta pagar uma parte: escolha o cliente para registrar como fiado.")
            return
        }

        setSaving(true)

        try {
            await createSale({
                customer_id: customer?.id ?? null,
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

    const itemCount = items.reduce((sum, line) => sum + toQuantity(line.quantity), 0)

    return (
        <>
        <form onSubmit={handleSubmit} className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-8 sm:py-8 lg:pb-8">
            <div className="mb-6">
                <Link to="/sales" className="text-sm text-slate-500 hover:underline">
                    ← Vendas
                </Link>
                <h1 className="page-title">Nova venda</h1>
            </div>

            {loadError && <p className="mb-4 text-sm text-red-600">{loadError}</p>}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
                {/* Left: product catalog */}
                <section className="min-w-0">
                    <input
                        ref={searchRef}
                        type="search"
                        placeholder="Buscar por nome ou bipar o código de barras"
                        value={search}
                        onChange={(e) => changeSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className={inputClass}
                    />

                    {scanMessage && (
                        <p
                            role="status"
                            className={`mt-2 rounded-lg px-3 py-2 text-sm ${
                                scanMessage.ok
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "bg-red-50 text-red-700"
                            }`}
                        >
                            {scanMessage.text}
                        </p>
                    )}

                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <button
                            type="button"
                            onClick={() => changeCategory(null)}
                            className={chipClass(categoryId === null)}
                        >
                            Todos
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                type="button"
                                onClick={() => changeCategory(category.id)}
                                className={chipClass(categoryId === category.id)}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                        {filteredProducts.length}{" "}
                        {filteredProducts.length === 1 ? "produto" : "produtos"} · toque para
                        adicionar à venda
                    </p>

                    {filteredProducts.length === 0 ? (
                        <p className="empty-state mt-3">Nenhum produto encontrado.</p>
                    ) : (
                        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                            {visibleProducts.map((product) => (
                                <li key={product.id} className="flex">
                                    <SaleProductCard
                                        product={product}
                                        inSale={inSale}
                                        onAdd={addProduct}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}

                    <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
                </section>

                {/* Right: the current sale */}
                <aside
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setPanelOpen(false)
                    }}
                    className={`lg:sticky lg:top-20 ${
                        panelOpen
                            ? "max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:flex max-lg:items-end max-lg:bg-slate-900/40"
                            : "max-lg:hidden"
                    }`}
                >
                    <div className="card flex flex-col max-lg:max-h-[92dvh] max-lg:w-full max-lg:rounded-b-none lg:max-h-[calc(100vh-6.5rem)]">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                            <h2 className="text-base font-semibold text-slate-900">Venda atual</h2>
                            <div className="flex items-center gap-3">
                                <span className="badge bg-brand-50 text-brand-700">
                                    {itemCount} {itemCount === 1 ? "item" : "itens"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPanelOpen(false)}
                                    className="text-sm font-medium text-slate-500 hover:underline lg:hidden"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
                            {/* Items */}
                            <section>
                                {items.length === 0 ? (
                                    <p className="py-4 text-center text-sm text-slate-500">
                                        Nenhum produto adicionado.
                                    </p>
                                ) : (
                                    <ul className="space-y-3">
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
                                                    className="rounded-lg border border-slate-200 p-3"
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
                                                                            variationId: Number(
                                                                                e.target.value,
                                                                            ),
                                                                        })
                                                                    }
                                                                    className="ui-input mt-1 px-2"
                                                                >
                                                                    {line.product.variations.map(
                                                                        (variation) => (
                                                                            <option
                                                                                key={variation.id}
                                                                                value={variation.id}
                                                                            >
                                                                                {variation.name} (
                                                                                {variation.stock_quantity}
                                                                                )
                                                                            </option>
                                                                        ),
                                                                    )}
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

                                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className={labelClass}>
                                                                Quantidade
                                                            </label>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    aria-label="Diminuir quantidade"
                                                                    disabled={toQuantity(line.quantity) <= 1}
                                                                    onClick={() => changeQuantity(line.key, -1)}
                                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-lg text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                                >
                                                                    −
                                                                </button>
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
                                                                    className="ui-input w-full min-w-0 px-1 text-center"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    aria-label="Aumentar quantidade"
                                                                    disabled={toQuantity(line.quantity) >= stock}
                                                                    onClick={() => changeQuantity(line.key, 1)}
                                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-lg text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className={labelClass}>
                                                                Preço unitário
                                                            </label>
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
                                                                className={inputClass}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 flex items-center justify-between">
                                                        <label className="flex items-center gap-2 text-sm text-slate-700">
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
                                                        <p className="text-sm font-semibold tabular-nums text-slate-900">
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
                                <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    Embalagens usadas (opcional)
                                </h3>

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
                                            const packaging = packagings.find(
                                                (p) => p.id === line.packagingId,
                                            )

                                            return (
                                                <li
                                                    key={line.key}
                                                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                                                >
                                                    <span className="min-w-0 truncate text-sm text-slate-900">
                                                        {packaging?.name}
                                                    </span>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="1"
                                                            value={line.quantity}
                                                            onChange={(e) =>
                                                                updatePackaging(
                                                                    line.key,
                                                                    e.target.value,
                                                                )
                                                            }
                                                            className="ui-input w-16 px-2"
                                                            aria-label="Quantidade de embalagens"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removePackaging(line.key)}
                                                            className="rounded-md px-2 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
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
                                <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    Cliente (obrigatório se for fiado)
                                </h3>
                                <CustomerPicker
                                    customers={customers}
                                    selected={customer}
                                    onSelect={setCustomer}
                                    onNewCustomer={() => setShowCustomerForm(true)}
                                />
                            </section>

                            {/* Payments */}
                            <section>
                                <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    Pagamento
                                </h3>

                                <div className="mb-3 flex flex-wrap gap-2">
                                    {PAYMENT_METHOD_OPTIONS.map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            disabled={remainingCents <= 0}
                                            onClick={() => addPayment(value)}
                                            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            + {label}
                                        </button>
                                    ))}
                                </div>

                                {payments.length === 0 ? (
                                    <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
                                        Nenhum pagamento: a venda inteira fica como fiado.
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {payments.map((line) => (
                                            <li
                                                key={line.key}
                                                className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
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
                                                        updatePayment(line.key, {
                                                            amount: e.target.value,
                                                        })
                                                    }
                                                    className={inputClass}
                                                    aria-label="Valor pago"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removePayment(line.key)}
                                                    aria-label="Remover pagamento"
                                                    className="flex h-9 w-9 items-center justify-center rounded-md text-lg text-red-600 transition hover:bg-red-50"
                                                >
                                                    ×
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>

                        {/* Summary + finish button, always visible at the bottom of the panel */}
                        <div className="space-y-3 border-t border-slate-100 p-4">
                            <dl className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-slate-500">Custo</dt>
                                    <dd className="tabular-nums text-slate-700">
                                        {costKnown ? formatCurrency(costCents / 100) : "—"}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-500">Lucro estimado</dt>
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
                                <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
                                    <dt className="font-medium text-slate-700">Total</dt>
                                    <dd className="text-xl font-semibold tabular-nums text-slate-900">
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
                                    <div className="flex justify-between rounded-md bg-amber-50 px-2 py-1.5">
                                        <dt className="text-amber-800">Falta pagar · fica como fiado</dt>
                                        <dd className="font-medium tabular-nums text-amber-800">
                                            {formatCurrency(remainingCents / 100)}
                                        </dd>
                                    </div>
                                )}
                                {remainingCents < 0 && (
                                    <p className="text-red-600">Pagamentos passam do total.</p>
                                )}
                            </dl>

                            {!costKnown && items.length > 0 && (
                                <p className="text-xs text-slate-500">
                                    Algum produto está sem preço de custo, então o lucro não é
                                    calculado.
                                </p>
                            )}

                            {error && <p className="text-sm text-red-600">{error}</p>}

                            <button
                                type="submit"
                                disabled={saving}
                                className="btn btn-primary w-full justify-between py-2.5"
                            >
                                <span>{saving ? "Registrando..." : "Finalizar venda"}</span>
                                <span className="tabular-nums">
                                    {formatCurrency(totalCents / 100)}
                                </span>
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
            {/* Mobile: bar that opens the sale panel */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:hidden">
                <button
                    type="button"
                    onClick={() => setPanelOpen(true)}
                    className="btn btn-primary flex w-full items-center justify-between"
                >
                    <span>
                        {itemCount} {itemCount === 1 ? "item" : "itens"} · Ver venda
                    </span>
                    <span className="tabular-nums">{formatCurrency(totalCents / 100)}</span>
                </button>
            </div>
        </form>

        {/* Outside the <form>: the customer form has its own <form>, and saving it must not finish the sale */}
        <CustomerFormModal
            open={showCustomerForm}
            customer={null}
            onClose={() => setShowCustomerForm(false)}
            onSaved={handleCustomerSaved}
        />
        </>
    )
}