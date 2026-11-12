import { useState } from "react"
import type { Customer } from "../types"
import { formatCurrency, normalizeText } from "../utils/format"
import { formatPhone } from "../utils/sales"

const MAX_RESULTS = 5

interface CustomerPickerProps {
    customers: Customer[]
    selected: Customer | null
    onSelect: (customer: Customer | null) => void
    onNewCustomer: () => void
}

export function CustomerPicker({
    customers,
    selected,
    onSelect,
    onNewCustomer,
}: CustomerPickerProps) {
    const [search, setSearch] = useState("")

    const text = normalizeText(search.trim())
    const digits = search.replace(/\D/g, "")

    const matches = text
        ? customers
              .filter(
                  (customer) =>
                      normalizeText(customer.name).includes(text) ||
                      (digits !== "" && (customer.phone ?? "").includes(digits)),
              )
              .slice(0, MAX_RESULTS)
        : []

    function choose(customer: Customer) {
        onSelect(customer)
        setSearch("")
    }

    if (selected) {
        return (
            <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{selected.name}</p>
                        {selected.phone && (
                            <p className="text-xs text-slate-500">{formatPhone(selected.phone)}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="-my-1 shrink-0 rounded-md px-2 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                        Trocar
                    </button>
                </div>

                {selected.open_balance > 0 && (
                    <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
                        Este cliente já deve {formatCurrency(selected.open_balance)} em aberto.
                    </p>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                // Enter must not finish the sale while the seller is searching
                onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault()
                }}
                placeholder="Buscar cliente por nome ou telefone"
                className="ui-input w-full"
            />

            {text && matches.length > 0 && (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {matches.map((customer) => (
                        <li key={customer.id}>
                            <button
                                type="button"
                                onClick={() => choose(customer)}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-slate-50"
                            >
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-slate-900">
                                        {customer.name}
                                    </span>
                                    {customer.phone && (
                                        <span className="block text-xs text-slate-500">
                                            {formatPhone(customer.phone)}
                                        </span>
                                    )}
                                </span>
                                {customer.open_balance > 0 && (
                                    <span className="badge shrink-0 bg-amber-100 text-amber-700">
                                        deve {formatCurrency(customer.open_balance)}
                                    </span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {text && matches.length === 0 && (
                <p className="text-sm text-slate-500">Nenhum cliente encontrado.</p>
            )}

            <button
                type="button"
                onClick={onNewCustomer}
                className="text-sm font-medium text-brand-700 hover:underline"
            >
                + Novo cliente
            </button>
        </div>
    )
}