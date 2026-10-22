interface StockFlowProps {
    size?: "sm" | "md" | "lg"
    onDark?: boolean
}

const SIZES = {
    sm: { icon: "h-5 w-5", text: "text-base" },
    md: { icon: "h-7 w-7", text: "text-xl" },
    lg: { icon: "h-10 w-10", text: "text-3xl" },
}

export function StockFlowLogo({ size = "md", onDark = false }: StockFlowProps) {
    const { icon, text } = SIZES[size]

    return (
        <span className="inline-flex items-center gap-2">
            <svg viewBox="0 0 64 56" className={icon} aria-hidden="true">
                <rect x="22" y="2" width="38" height="12" rx="6" fill="#2DD4BF" />
                <rect x="6" y="22" width="40" height="12" rx="6" fill="#0D9488" />
                <path d="M6 42H50L60 48L50 54H6A6 6 0 0 1 6 42Z" fill="#0F766E" />
            </svg>
            <span
                className={`${text} font-bold tracking-tight ${
                    onDark ? "text-white" : "text-slate-900"
                }`}
            >
                Stock
                <span className={onDark ? "text-teal-300" : "text-brand-700"}>Flow</span>
            </span>
        </span>
    )
}