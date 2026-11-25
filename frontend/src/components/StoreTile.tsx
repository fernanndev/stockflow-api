import type { StoreSettings } from "../types"
import { getImageUrl } from "../utils/image"
import { effectivePrimary } from "../utils/theme"

// A small square for one store: its logo, or its initial in its own main color.
export function StoreTile({
    store,
    className = "h-8 w-8 text-sm",
}: {
    store: StoreSettings
    className?: string
}) {
    const logo = getImageUrl(store.logo_url)

    if (logo) {
        return (
            <img
                src={logo}
                alt=""
                className={`${className} shrink-0 rounded-md border border-slate-200 bg-white object-contain`}
            />
        )
    }

    return (
        <span
            aria-hidden="true"
            style={{ backgroundColor: effectivePrimary(store.primary_color) }}
            className={`${className} flex shrink-0 items-center justify-center rounded-md font-bold text-white`}
        >
            {store.name.trim().charAt(0).toUpperCase()}
        </span>
    )
}
