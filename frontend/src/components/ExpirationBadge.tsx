import { daysUntil, EXPIRING_SOON_DAYS } from "../utils/date";

export function ExpirationBadge({ isoDate }: { isoDate: string }) {
    const days = daysUntil(isoDate)

    if (days < 0) {
        return (
            <span className="badge ml-2 bg-red-50 text-red-700 ring-1 ring-red-600/15">
                Vencido
            </span>
        )
    }

    if (days <= EXPIRING_SOON_DAYS) {
        return (
            <span className="badge ml-2 bg-amber-50 text-amber-800 ring-1 ring-amber-600/20">
                {days === 0 ? "Vence hoje": `Vence em ${days} ${days === 1? "dia" : "dias"}`}
            </span>
        )
    }

    return null
}