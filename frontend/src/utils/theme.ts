import type { StoreSettings } from "../types"

// The look the system had before stores could change it (StockFlow teal).
export const DEFAULT_STORE: StoreSettings = {
    name: "Minha loja",
    primary_color: "#0f766e",
    background_color: "#f8fafc",
    surface_color: "#ffffff",
    logo_url: null,
}

// Quick picks for the main color; any other #rrggbb color can still be typed.
export const PRIMARY_SUGGESTIONS = [
    { label: "StockFlow", value: "#0f766e" },
    { label: "Azul", value: "#2563eb" },
    { label: "Roxo", value: "#7c3aed" },
    { label: "Rosa", value: "#be185d" },
    { label: "Vermelho", value: "#dc2626" },
    { label: "Laranja", value: "#ea580c" },
    { label: "Verde", value: "#16a34a" },
    { label: "Grafite", value: "#334155" },
]

// Only light tones are offered for the background and the cards: all the text of the
// system is dark, so a dark background would make it unreadable.
export const BACKGROUND_PRESETS = [
    { label: "Cinza claro", value: "#f8fafc" },
    { label: "Branco", value: "#ffffff" },
    { label: "Neutro", value: "#f5f5f4" },
    { label: "Bege", value: "#faf5ee" },
    { label: "Rosa claro", value: "#fdf2f8" },
    { label: "Lilás claro", value: "#f5f3ff" },
    { label: "Azul claro", value: "#eff6ff" },
    { label: "Verde claro", value: "#f0fdf4" },
]

export const SURFACE_PRESETS = [
    { label: "Branco", value: "#ffffff" },
    { label: "Marfim", value: "#fffcf7" },
    { label: "Névoa", value: "#fafafa" },
    { label: "Rosado", value: "#fffafc" },
]

const SHADES = [50, 100, 200, 500, 600, 700, 800] as const

type Shade = (typeof SHADES)[number]

interface Hsl {
    h: number
    s: number
    l: number
}

function hexToRgb(hex: string): [number, number, number] {
    const value = parseInt(hex.slice(1), 16)
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function hexToHsl(hex: string): Hsl {
    const [r, g, b] = hexToRgb(hex).map((channel) => channel / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2

    if (max === min) return { h: 0, s: 0, l }

    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    let h: number
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4

    return { h: h * 60, s, l }
}

function hslToHex({ h, s, l }: Hsl): string {
    const a = s * Math.min(l, 1 - l)

    function channel(n: number): string {
        const k = (n + h / 30) % 12
        const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
        return Math.round(value * 255)
            .toString(16)
            .padStart(2, "0")
    }

    return `#${channel(0)}${channel(8)}${channel(4)}`
}

function luminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex).map((channel) => {
        const c = channel / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// contrast ratio between the color and white text (WCAG): 4.5 or more is easy to read
export function contrastWithWhite(hex: string): number {
    return 1.05 / (luminance(hex) + 0.05)
}

// Buttons use white text on the main color, so a color that is too light is darkened
// until the text is readable. Returns the color the system will really use.
export function effectivePrimary(primary: string): string {
    const hsl = hexToHsl(primary)

    while (contrastWithWhite(hslToHex(hsl)) < 4.5 && hsl.l > 0.12) {
        hsl.l -= 0.01
    }

    return hslToHex(hsl)
}

export function buildPalette(primary: string): Record<Shade, string> {
    const main = hexToHsl(effectivePrimary(primary))
    const tint = Math.min(main.s, 0.9)

    return {
        50: hslToHex({ h: main.h, s: tint, l: 0.97 }),
        100: hslToHex({ h: main.h, s: tint, l: 0.93 }),
        200: hslToHex({ h: main.h, s: tint, l: 0.85 }),
        500: hslToHex({ ...main, l: Math.min(main.l + 0.14, 0.6) }),
        600: hslToHex({ ...main, l: Math.min(main.l + 0.07, 0.5) }),
        700: hslToHex(main),
        800: hslToHex({ ...main, l: Math.max(main.l - 0.08, 0.08) }),
    }
}

// Same values as the @theme block in index.css (the StockFlow teal).
const DEFAULT_PALETTE: Record<Shade, string> = {
    50: "#f0fdfa",
    100: "#ccfbf1",
    200: "#99f6e4",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    800: "#115e59",
}

type ThemeColors = Pick<StoreSettings, "primary_color" | "background_color" | "surface_color">

// The CSS variables of a look. Tailwind utilities (bg-brand-700, bg-surface...) read them.
export function themeVariables(colors: ThemeColors): Record<string, string> {
    const palette =
        colors.primary_color === DEFAULT_STORE.primary_color
            ? DEFAULT_PALETTE
            : buildPalette(colors.primary_color)

    const variables: Record<string, string> = {
        "--color-app": colors.background_color,
        "--color-surface": colors.surface_color,
    }

    SHADES.forEach((shade) => {
        variables[`--color-brand-${shade}`] = palette[shade]
    })

    return variables
}

// Applies the look to the whole page.
export function applyTheme(colors: ThemeColors) {
    const root = document.documentElement

    Object.entries(themeVariables(colors)).forEach(([name, value]) =>
        root.style.setProperty(name, value),
    )
}

const CACHE_KEY = "store_settings"

// the last known look is kept so the page does not flash the default colors on reload
export function readCachedStore(): StoreSettings {
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (raw) return { ...DEFAULT_STORE, ...JSON.parse(raw) }
    } catch {
        // no storage or broken value: use the default look
    }

    return DEFAULT_STORE
}

export function cacheStore(store: StoreSettings) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(store))
    } catch {
        // storage blocked: the look just will not be remembered
    }
}
