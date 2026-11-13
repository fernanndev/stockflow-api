import { isAxiosError } from "axios";

// the API explains (in English) which product already uses a code: show it in Portuguese
export function barcodeErrorMessage(error: unknown): string | null {
    if (!isAxiosError(error) || error.response?.status !== 400) return null

    const detail = error.response.data?.detail

    if (typeof detail !== "string") return null

    const used = detail.match(/^This barcode already belongs to "(.+)" \((.+)\)\.$/)

    if (used) return `Este código de barras já pertence a "${used[1]}" (${used[2]}).`

    if (detail.startsWith("This product has several variations")) {
        return "Este produto tem várias variações: defina o código em cada uma, em Lotes."
    }

    return null
}

// a barcode reader types the code and presses Enter: that must not submit a form
export function ignoreEnter(event: { key: string; preventDefault: () => void }) {
    if (event.key === "Enter") event.preventDefault()
}