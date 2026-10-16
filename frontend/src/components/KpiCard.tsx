import { Link } from "react-router-dom"

type Tone = "neutral" | "danger" | "warning"

const TONE_STYLES: Record<Tone, string> = {
    neutral: "border-l-slate-300",
    danger: "border-l-red-500",
    warning: "border-l-amber-500",
}

interface KpiCardProps {
    label: string
    value: string | number
    to: string
    tone?: Tone
    hint?: string
}

export function KpiCard({ label, value, to, tone ="neutral", hint }: KpiCardProps) {
    return(
        <Link
            to={to}
            className={`block rounded-lg border border-l-4 border-slate-200 bg-white p-5 trasition hover:border-slate-300 hover:shadow-sm ${TONE_STYLES[tone]}`}
        >
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </Link>
    )
}