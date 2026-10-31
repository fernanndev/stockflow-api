import { formatCurrency } from "../utils/format"

interface ProfitValueProps {
    value: number | null
}

export function ProfitValue({ value }: ProfitValueProps) {
    if (value === null) {
        return <span className="text-slate-400">—</span>
    }

    const tone = value < 0 ? "text-red-600" : "text-emerald-700"

    return <span className={tone}>{formatCurrency(value)}</span>
}