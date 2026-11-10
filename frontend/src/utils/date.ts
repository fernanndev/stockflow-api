export const EXPIRING_SOON_DAYS = 30

export function formatDate(isoDate: string): string {
    const [year, month, day] = isoDate.split("-")
    return `${day}/${month}/${year}`
}

export function daysUntil(isoDate: string): number {
    const [year, month, day] = isoDate.split("-").map(Number)
    const expiration = new Date(year, month - 1, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return Math.round((expiration.getTime() - today.getTime()) / 86_400_000)
}

// local date as YYYY-MM-DD (toISOString would use UTC and could shift the day)
export function toIsoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${date.getFullYear()}-${month}-${day}`
}