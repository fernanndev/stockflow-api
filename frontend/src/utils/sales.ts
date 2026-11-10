import type { PaymentMethod, Sale } from "../types";
import { formatCurrency } from "./format";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string>  = {
    pix: "Pix",
    cash: "Dinheiro",
    credit_card: "Cartão de crédito",
    debit_card: "Cartão de débito",
    other: "Outro",
}

export const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS) as [
    PaymentMethod,
    string,
][]

export function saleSituation(sale: Sale): { label: string; className: string } {
    if (sale.status === "canceled") {
        return { label: "Cancelada", className: "bg-slate-200 text-slate-600" }
    }
    if (sale.total === 0) {
        return { label: "Sem cobrança", className: "bg-slate-100 text-slate-600" }
    }
    if (sale.balance <= 0) {
        return { label: "Paga", className: "bg-emerald-100 text-emerald-700" }
    }
    if (sale.paid_amount > 0) {
        return { label: "Parcial", className: "bg-amber-100 text-amber-700" }
    }
    return { label: "Fiado", className: "bg-amber-100 text-amber-700" }
}

export function itemsSummary(sale: Sale): string {
    return sale.items
        .map((item) => {
            const variation = item.variation_name === "Padrão" ? "" : `(${item.variation_name})`
            const gift = item.is_gift ? " - brinde" : ""

            return `${item.quantity}x ${item.product_name}${variation}${gift}`
        })
            .join(", ")
}

// null when some item has no cost registered: the profit would be wrong
export function saleProfit(sale: Sale): { cost: number; profit: number } | null {
    if (sale.items.some((item) => item.unit_cost === null)) return null

    const itemsCost = sale.items.reduce(
        (sum, item) => sum + (item.unit_cost ?? 0) * item.quantity,
        0,
    )
    const packagingsCost = sale.packagings.reduce(
        (sum, packaging) => sum + packaging.unit_cost * packaging.quantity,
        0,
    )
    const cost = itemsCost + packagingsCost

    return { cost, profit: sale.total - cost }
}

// the API keeps only digits; show them as (11) 91234-5678
export function formatPhone(digits: string): string {
    const national = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits

    if (national.length === 11) {
        return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`
    }
    if (national.length === 10) {
        return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`
    }

    return digits
}

export function whatsappLink(phone: string, message: string): string {
    // 10-11 digits = no country code yet: add Brazil's 55
    const full = phone.length <= 11 ? `55${phone}` : phone

    return `https://wa.me/${full}?text=${encodeURIComponent(message)}`
}

export function chargeMessage(sale: Sale): string {
    const firstName = (sale.customer_name ?? "").split(" ")[0]
    const greeting = firstName ? `Olá, ${firstName}!` : "Olá!"

    return `${greeting} Tudo bem? Passando para lembrar do valor de ${formatCurrency(sale.balance)} que ficou em aberto na sua compra. Quando puder, me avise. Obrigado!`
}