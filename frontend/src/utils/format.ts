export function formatCurrency(value: number): string {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function normalizeText(text: string): string {
    return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase()
}

export function formatUnitCost(value: number): string {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    })
}