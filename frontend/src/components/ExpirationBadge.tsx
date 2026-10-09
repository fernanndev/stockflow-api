import { daysUntil, EXPIRING_SOON_DAYS } from "../utils/date";

export function ExpirationBadge({ isoDate }: { isoDate: string }) {
    const days = daysUntil(isoDate)

    if (days < 0) {
        return (
            <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Vencido
            </span>
        )
    }

    if (days <= EXPIRING_SOON_DAYS) {
        return (
            <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                {days === 0 ? "Vence hoje" : `Vence em ${days === 1 ? "dia": "dias"}`}
            </span>
        )
    }

    return null
}