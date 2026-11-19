import type { StoreSettings } from "../types"
import { formatCurrency } from "./format"

type CardSettings = Pick<StoreSettings, "card_surcharge_percent" | "interest_free_installments">

// The store only shows a card price when it set a percentage.
export function hasCardPrice(settings: CardSettings): boolean {
    return settings.card_surcharge_percent > 0
}

// What the customer pays at the card so the store receives exactly the cash price after
// the machine fee: the same math as the card machine (100 at 12.4% -> 114.16).
export function cardPrice(cashPrice: number, percent: number): number {
    if (percent <= 0) return cashPrice

    return Math.round((cashPrice / (1 - percent / 100)) * 100) / 100
}

// "R$ 129,03 em até 3x sem juros" (for a field that is already labeled "No cartão")
export function cardPriceShort(cashPrice: number, settings: CardSettings): string {
    const total = formatCurrency(cardPrice(cashPrice, settings.card_surcharge_percent))
    const n = settings.interest_free_installments

    return n <= 1 ? total : `${total} em até ${n}x sem juros`
}

// "R$ 129,03 no cartão em até 3x sem juros"
export function cardPriceLabel(cashPrice: number, settings: CardSettings): string {
    const total = formatCurrency(cardPrice(cashPrice, settings.card_surcharge_percent))
    const n = settings.interest_free_installments

    return n <= 1 ? `${total} no cartão` : `${total} no cartão em até ${n}x sem juros`
}

// "3x de R$ 43,01"
export function installmentLabel(cashPrice: number, settings: CardSettings): string | null {
    const n = settings.interest_free_installments

    if (n <= 1) return null

    const total = cardPrice(cashPrice, settings.card_surcharge_percent)

    return `${n}x de ${formatCurrency(Math.round((total / n) * 100) / 100)}`
}

// Text ready to paste in WhatsApp for a customer.
export function priceMessage(name: string, cashPrice: number, settings: CardSettings): string {
    const lines = [`*${name}*`]

    if (hasCardPrice(settings)) {
        lines.push(`💳 ${cardPriceLabel(cashPrice, settings)}`)
        lines.push(`💵 ${formatCurrency(cashPrice)} com desconto à vista`)
    } else {
        lines.push(`💵 ${formatCurrency(cashPrice)}`)
    }

    return lines.join("\n")
}

// Copies to the clipboard. The modern API needs HTTPS (or localhost); the fallback covers
// pages opened by IP in the local network and older phones.
export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        // try the old way below
    }

    const field = document.createElement("textarea")
    field.value = text
    field.setAttribute("readonly", "")
    field.style.position = "fixed"
    field.style.opacity = "0"
    document.body.appendChild(field)
    field.select()

    try {
        return document.execCommand("copy")
    } catch {
        return false
    } finally {
        document.body.removeChild(field)
    }
}
