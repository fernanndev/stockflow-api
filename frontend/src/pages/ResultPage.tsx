import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { getResult } from "../api/reports"
import type { ResultReport } from "../types"
import { formatCurrency } from "../utils/format"
import { PERIOD_OPTIONS, periodRange, type Period } from "../utils/period"

const inputClass = "ui-input"

function Row({
    label,
    hint,
    value,
    tone = "text-slate-900",
}: {
    label: string
    hint?: string
    value: string
    tone?: string
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5">
            <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{label}</p>
                {hint && <p className="text-xs text-slate-500">{hint}</p>}
            </div>
            <p className={`shrink-0 text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
        </div>
    )
}

function InfoCard({
    label,
    value,
    hint,
    tone = "text-slate-900",
}: {
    label: string
    value: string
    hint?: ReactNode
    tone?: string
}) {
    return (
        <div className="card p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
            <p className={`mt-1 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl ${tone}`}>
                {value}
            </p>
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
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

    function setFilter(key: string, value: string) {
        const next = new URLSearchParams(searchParams)

        if (value) {
            next.set(key, value)
        } else {
            next.delete(key)
        }

        setSearchParams(next, { replace: true })
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

    const loss = result !== null && result.profit < 0

    return (
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-6">
                <h1 className="page-title">Resultado</h1>
                <p className="text-sm text-slate-500">Lucro ou prejuízo do período escolhido.</p>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
                <select
                    value={period}
                    onChange={(e) => setFilter("period", e.target.value)}
                    className={`${inputClass} w-full sm:w-auto`}
                    aria-label="Período"
                >
                    {PERIOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {period === "custom" && (
                    <>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFilter("from", e.target.value)}
                            className={inputClass}
                            aria-label="De"
                        />
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setFilter("to", e.target.value)}
                            className={inputClass}
                            aria-label="Até"
                        />
                    </>
                )}
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {result === null ? (
                !error && <p className="text-sm text-slate-500">Carregando...</p>
            ) : (
                <div className="space-y-6">
                    <div className="card p-5 sm:p-6">
                        <p className="text-sm font-medium text-slate-500">
                            {loss ? "Prejuízo do período" : "Lucro do período"}
                        </p>
                        <p
                            className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl ${
                                loss ? "text-red-600" : "text-emerald-700"
                            }`}
                        >
                            {formatCurrency(result.profit)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            {result.sales_count} {result.sales_count === 1 ? "venda" : "vendas"} com
                            cobrança
                        </p>
                    </div>

                    {result.items_without_cost > 0 && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            {result.items_without_cost}{" "}
                            {result.items_without_cost === 1
                                ? "item está sem custo cadastrado"
                                : "itens estão sem custo cadastrado"}
                            , então o lucro real é <strong>menor</strong> que o mostrado. Informe o
                            custo em{" "}
                            <Link to="/products" className="font-medium underline">
                                Produtos
                            </Link>
                            .
                        </p>
                    )}

                    <div className="card p-4 sm:p-5">
                        <h2 className="text-sm font-semibold text-slate-900">
                            Como chegamos a esse valor
                        </h2>
                        <div className="mt-2 divide-y divide-slate-100">
                            <Row
                                label="Vendas"
                                hint="Valor vendido, sem cancelamentos nem brindes"
                                value={formatCurrency(result.revenue)}
                            />
                            <Row
                                label="Custo dos produtos vendidos"
                                value={`− ${formatCurrency(result.products_cost)}`}
                            />
                            <Row
                                label="Embalagens usadas"
                                value={`− ${formatCurrency(result.packagings_cost)}`}
                            />
                            <Row
                                label="Brindes"
                                hint="Quanto custaram os produtos dados de brinde"
                                value={`− ${formatCurrency(result.gifts_cost)}`}
                            />
                            <Row
                                label="Perdas"
                                hint="Saídas por vencimento, perda ou quebra"
                                value={`− ${formatCurrency(result.losses_cost)}`}
                            />
                            <Row
                                label={loss ? "Prejuízo" : "Lucro"}
                                value={formatCurrency(result.profit)}
                                tone={loss ? "text-red-600" : "text-emerald-700"}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                        <InfoCard
                            label="Já recebido"
                            value={formatCurrency(result.received)}
                            hint="Pagamentos das vendas do período"
                        />
                        <InfoCard
                            label="Fiado em aberto"
                            value={formatCurrency(result.open_balance)}
                            tone={result.open_balance > 0 ? "text-amber-700" : "text-slate-900"}
                            hint={
                                result.open_balance > 0 ? (
                                    <Link to="/customers?filter=open" className="underline">
                                        Ver quem deve
                                    </Link>
                                ) : undefined
                            }
                        />
                        <InfoCard
                            label="Deixou de ganhar com brindes"
                            value={formatCurrency(result.gifts_forgone_revenue)}
                            hint="Preço de venda dos brindes. Não entra na conta acima."
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
