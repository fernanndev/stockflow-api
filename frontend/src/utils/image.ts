export function getImageUrl(imageUrl: string | null): string | null {
    if  (!imageUrl) return null

    return `${import.meta.env.VITE_API_URL}${imageUrl}`
}