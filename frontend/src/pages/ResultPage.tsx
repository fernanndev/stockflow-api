import { useCallback, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { getResult } from "../api/reports"
import type { ResultReport } from "../types"
import { formatDate } from "../utils/date"
import { formatCurrency } from "../utils/format"
import { PERIOD_OPTIONS, periodRange, type Period } from "../utils/period"

const inputClass = "ui-input"

// shorter names for the segmented buttons
const SHORT_LABELS: Record<Period, string> = {
    today: "Hoje",
    "7d": "7 dias",
    month: "Este mês",
    last_month: "Mês passado",
    all: "Tudo",
    custom: "Personalizado",
}

function percent(value: number, base: number): number {
    return base > 0 ? (value / base) * 100 : 0
}

function formatPercent(value: number): string {
    if (value > 0 && value < 1) return "<1%"

    return `${Math.round(value)}%`
}

function Bar({ pct, className }: { pct: number; className: string }) {
    // a tiny value still gets a visible sliver
    const width = pct > 0 ? Math.min(100, Math.max(pct, 1.5)) : 0

    return (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${className}`} style={{ width: `${width}%` }} />
        </div>
    )
}

function BreakdownRow({
    label,
    hint,
    value,
    revenue,
    negative = false,
    barClass,
}: {
    label: string
    hint?: string
    value: number
    revenue: number
    negative?: boolean
    barClass: string
}) {
    const pct = percent(value, revenue)

    return (
        <div className="py-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{label}</p>
                    {hint && <p className="text-xs text-slate-500">{hint}</p>}
                </div>
                <div className="flex shrink-0 items-baseline gap-3">
                    <span className="text-xs tabular-nums text-slate-400">{formatPercent(pct)}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {negative ? "− " : ""}
                        {formatCurrency(value)}
                    </span>
                </div>
            </div>
            <Bar pct={pct} className={barClass} />
        </div>
    )
}

export function ResultPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const rawPeriod = searchParams.get("period")
    const period: Period = PERIOD_OPTIONS.some((option) => option.value === rawPeriod)
        ? (rawPeriod as Period)
        : "month"
    const from = searchParams.get("from") ?? ""
    const to = searchParams.get("to") ?? ""

    const [result, setResult] = useState<ResultReport | null>(null)
    const [error, setError] = useState<string | null>(null)

    // the dates of the chosen period, so the pickers always show what is being calculated
    const range = periodRange(period, from, to)
    const startDate = range.start_date ?? ""
    const endDate = range.end_date ?? ""

    function setParams(patch: Record<string, string>) {
        const next = new URLSearchParams(searchParams)

        for (const [key, value] of Object.entries(patch)) {
            if (value) {
                next.set(key, value)
            } else {
                next.delete(key)
            }
        }

        setSearchParams(next, { replace: true })
    }

    function choosePeriod(value: Period) {
        // leaving "custom" forgets the typed dates
        setParams({ period: value, from: "", to: "" })
    }

    // editing a date turns any period into a custom one, starting from the dates shown
    function changeDate(key: "from" | "to", value: string) {
        setParams({
            period: "custom",
            from: key === "from" ? value : startDate,
            to: key === "to" ? value : endDate,
        })
    }

    const loadData = useCallback(async () => {
        try {
            setResult(await getResult(periodRange(period, from, to)))
            setError(null)
        } catch {
            setError("Não foi possível carregar o resultado.")
        }
    }, [period, from, to])

    useEffect(() => {
        loadData()
    }, [loadData])

    const invalidRange = startDate !== "" && endDate !== "" && startDate > endDate

    const periodText =
        startDate && endDate
            ? `de ${formatDate(startDate)} a ${formatDate(endDate)}`
            : startDate
              ? `desde ${formatDate(startDate)}`
              : endDate
                ? `até ${formatDate(endDate)}`
                : "todo o período"

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div>
                    <h1 className="page-title">Resultado</h1>
                    <p className="text-sm text-slate-500">Quanto sobrou depois de pagar o que foi vendido.</p>
                </div>

                <div
                    role="group"
                    aria-label="Período"
                    className="scroll-fade-x flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-surface p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {PERIOD_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => choosePeriod(option.value)}
                            aria-pressed={period === option.value}
                            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                period === option.value
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            {SHORT_LABELS[option.value]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
                <span className="font-medium">Escolha o intervalo:</span>
                <label className="flex items-center gap-2">
                    De
                    <input
                        type="date"
                        value={startDate}
                        max={endDate || undefined}
                        onChange={(e) => changeDate("from", e.target.value)}
                        className={inputClass}
                    />
                </label>
                <label className="flex items-center gap-2">
                    até
                    <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(e) => changeDate("to", e.target.value)}
                        className={inputClass}
                    />
                </label>
            </div>

            {invalidRange && (
                <p className="mb-4 text-sm text-red-600">
                    A data inicial está depois da data final. Corrija o intervalo.
                </p>
            )}

            {error && !invalidRange && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {result === null ? (
                !error && <p className="text-sm text-slate-500">Carregando...</p>
            ) : (
                <ResultBody result={result} periodText={periodText} />
            )}
        </div>
    )
}

function ResultBody({ result, periodText }: { result: ResultReport; periodText: string }) {
    const loss = result.profit < 0
    const hasSales = result.sales_count > 0

    const margin = percent(result.profit, result.revenue)
    const ticket = hasSales ? result.revenue / result.sales_count : null
    const profitPerSale = hasSales ? result.profit / result.sales_count : null

    const received = result.received
    const open = result.open_balance
    const receivedPct = percent(received, received + open)

    return (
        <div className="space-y-5">
            <div className="card flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">
                        {loss ? "Prejuízo" : "Lucro"} · {periodText}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p
                            className={`text-3xl font-semibold tracking-tight tabular-nums sm:text-5xl ${
                                loss ? "text-red-600" : "text-emerald-700"
                            }`}
                        >
                            {formatCurrency(result.profit)}
                        </p>
                        {result.revenue > 0 && (
                            <span
                                className={`badge ${
                                    loss ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                                }`}
                            >
                                margem de {Math.round(margin)}%
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        {result.sales_count} {result.sales_count === 1 ? "venda" : "vendas"} com
                        cobrança · {formatCurrency(result.revenue)} vendidos
                    </p>
                </div>

                <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="text-xs text-slate-500">Ticket médio</p>
                        <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
                            {ticket === null ? "—" : formatCurrency(ticket)}
                        </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="text-xs text-slate-500">Lucro por venda</p>
                        <p
                            className={`mt-0.5 text-lg font-semibold tabular-nums ${
                                profitPerSale !== null && profitPerSale < 0
                                    ? "text-red-600"
                                    : "text-slate-900"
                            }`}
                        >
                            {profitPerSale === null ? "—" : formatCurrency(profitPerSale)}
                        </p>
                    </div>
                </div>
            </div>

            {result.items_without_cost > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p>
                        {result.items_without_cost}{" "}
                        {result.items_without_cost === 1
                            ? "item vendido está sem custo"
                            : "itens vendidos estão sem custo"}{" "}
                        — o lucro real é <strong>menor</strong> que o mostrado.
                    </p>
                    <Link to="/products" className="btn btn-secondary btn-sm">
                        Informar custos
                    </Link>
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="card p-4 sm:p-5">
                    <div className="flex items-baseline justify-between gap-3">
                        <h2 className="text-sm font-semibold text-slate-900">
                            Para onde foi cada real vendido
                        </h2>
                        <span className="text-xs text-slate-400">% das vendas</span>
                    </div>

                    <div className="mt-1 divide-y divide-slate-100">
                        <BreakdownRow
                            label="Vendas"
                            hint="Sem cancelamentos e sem brindes"
                            value={result.revenue}
                            revenue={result.revenue}
                            barClass="bg-slate-800"
                        />
                        <BreakdownRow
                            label="Custo dos produtos vendidos"
                            value={result.products_cost}
                            revenue={result.revenue}
                            negative
                            barClass="bg-slate-400"
                        />
                        <BreakdownRow
                            label="Perdas"
                            hint="Vencidos, quebra ou extravio"
                            value={result.losses_cost}
                            revenue={result.revenue}
                            negative
                            barClass="bg-slate-400"
                        />
                        <BreakdownRow
                            label="Brindes"
                            hint="Custo do que foi dado de presente"
                            value={result.gifts_cost}
                            revenue={result.revenue}
                            negative
                            barClass="bg-slate-400"
                        />
                        <BreakdownRow
                            label="Embalagens usadas"
                            value={result.packagings_cost}
                            revenue={result.revenue}
                            negative
                            barClass="bg-slate-400"
                        />
                    </div>

                    <div className="mt-1 border-t-2 border-slate-900 pt-3">
                        <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                                {loss ? "Prejuízo" : "Lucro"}
                            </p>
                            <div className="flex items-baseline gap-3">
                                <span className="text-xs tabular-nums text-slate-400">
                                    {formatPercent(Math.max(margin, 0))}
                                </span>
                                <span
                                    className={`text-xl font-semibold tabular-nums ${
                                        loss ? "text-red-600" : "text-emerald-700"
                                    }`}
                                >
                                    {formatCurrency(result.profit)}
                                </span>
                            </div>
                        </div>
                        <Bar
                            pct={Math.max(margin, 0)}
                            className={loss ? "bg-red-500" : "bg-emerald-600"}
                        />
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="card p-4 sm:p-5">
                        <h2 className="text-sm font-semibold text-slate-900">Recebimento</h2>

                        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full bg-emerald-600" style={{ width: `${receivedPct}%` }} />
                            <div
                                className="h-full bg-amber-500"
                                style={{ width: `${received + open > 0 ? 100 - receivedPct : 0}%` }}
                            />
                        </div>

                        <dl className="mt-3 space-y-1.5 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <dt className="flex items-center gap-2 text-slate-600">
                                    <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
                                    Já recebido
                                </dt>
                                <dd className="font-semibold tabular-nums text-slate-900">
                                    {formatCurrency(received)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className="flex items-center gap-2 text-slate-600">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                                    Fiado em aberto
                                </dt>
                                <dd
                                    className={`font-semibold tabular-nums ${
                                        open > 0 ? "text-amber-700" : "text-slate-900"
                                    }`}
                                >
                                    {formatCurrency(open)}
                                </dd>
                            </div>
                        </dl>

                        {open > 0 && (
                            <Link
                                to="/customers?filter=open"
                                className="btn btn-secondary mt-4 w-full"
                            >
                                Ver quem deve →
                            </Link>
                        )}
                    </div>

                    <div className="card p-4 sm:p-5">
                        <span className="badge bg-violet-50 text-violet-700 ring-1 ring-violet-600/15">
                            Brindes
                        </span>
                        <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">
                            {formatCurrency(result.gifts_forgone_revenue)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            É o preço de venda do que foi dado de presente. O custo real (
                            {formatCurrency(result.gifts_cost)}) já está descontado no lucro.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
