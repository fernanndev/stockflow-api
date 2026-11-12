import { Link } from "react-router-dom"

type Tone = "neutral" | "danger" | "warning"

const TONE_STYLES: Record<Tone, { dot: string; value: string }> = {
    neutral: { dot: "bg-slate-300", value: "text-slate-900" },
    danger: { dot: "bg-red-500", value: "text-red-700" },
    warning: { dot: "bg-amber-500", value: "text-amber-700" },
}

interface KpiCardProps {
    label: string
    value: string | number
    to: string
    tone?: Tone
    hint?: string
}

export function KpiCard({ label, value, to, tone ="neutral", hint }: KpiCardProps) {
    const styles = TONE_STYLES[tone]

    return(
        <Link
            to={to}
            className="card group block p-4 transition hover:border-slate-300 hover:shadow-md sm:p-5"
        >
            <p className="flex items-start gap-2 text-xs leading-tight font-medium text-slate-500 sm:text-sm">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${styles.dot}`} aria-hidden="true" />
                <span>{label}</span>
            </p>
            <p
                className={`mt-2 text-xl font-semibold tracking-tight tabular-nums sm:text-3xl ${styles.value}`}
            >
                {value}
            </p>
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </Link>
    )
}
