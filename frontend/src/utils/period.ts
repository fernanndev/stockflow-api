import { toIsoDate } from "./date"

export type Period = "today" | "7d" | "month" | "last_month" | "all" | "custom"

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: "today", label: "Hoje" },
    { value: "7d", label: "Últimos 7 dias" },
    { value: "month", label: "Este mês" },
    { value: "last_month", label: "Mês passado" },
    { value: "all", label: "Todo o período" },
    { value: "custom", label: "Personalizado" },
]

// the dates sent to the API (YYYY-MM-DD, in the store's local calendar)
export function periodRange(period: Period, from: string, to: string) {
    const today = new Date()

    if (period === "today") {
        return { start_date: toIsoDate(today), end_date: toIsoDate(today) }
    }

    if (period === "7d") {
        const start = new Date()
        start.setDate(start.getDate() - 6)
        return { start_date: toIsoDate(start), end_date: toIsoDate(today) }
    }

    if (period === "month") {
        const start = new Date(today.getFullYear(), today.getMonth(), 1)
        return { start_date: toIsoDate(start), end_date: toIsoDate(today) }
    }

    if (period === "last_month") {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        // day 0 of this month = last day of the previous one
        const end = new Date(today.getFullYear(), today.getMonth(), 0)
        return { start_date: toIsoDate(start), end_date: toIsoDate(end) }
    }

    if (period === "custom") {
        return { start_date: from || undefined, end_date: to || undefined }
    }

    return {}
}
