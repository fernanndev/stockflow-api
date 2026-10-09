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