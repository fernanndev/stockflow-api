import { useStore } from "../context/storeContext"
import { getImageUrl } from "../utils/image"

type Size = "sm" | "md" | "lg"

const SIZES = {
    sm: { logo: "h-8 max-w-[8rem]", tile: "h-7 w-7 text-sm", text: "text-base" },
    md: { logo: "h-9 max-w-[10rem] sm:h-11", tile: "h-9 w-9 text-lg", text: "text-base sm:text-xl" },
    lg: { logo: "h-20 max-w-[14rem]", tile: "h-14 w-14 text-2xl", text: "text-2xl" },
}

// The store identity: its logo (or an initial in the main color) and its name.
export function StoreBrand({ size = "md" }: { size?: Size }) {
    const { store } = useStore()
    const { logo, tile, text } = SIZES[size]
    const logoUrl = getImageUrl(store.logo_url)

    return (
        <span className="inline-flex min-w-0 items-center gap-2 sm:gap-2.5">
            {logoUrl ? (
                <img
                    src={logoUrl}
                    alt=""
                    className={`${logo} w-auto shrink-0 rounded-md object-contain`}
                />
            ) : (
                <span
                    aria-hidden="true"
                    className={`${tile} flex shrink-0 items-center justify-center rounded-lg bg-brand-700 font-bold text-white`}
                >
                    {store.name.trim().charAt(0).toUpperCase()}
                </span>
            )}
            <span className={`${text} truncate font-bold tracking-tight text-slate-900`}>
                {store.name}
            </span>
        </span>
    )
}
