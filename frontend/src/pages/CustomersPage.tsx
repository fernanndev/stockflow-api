import { isAxiosError } from "axios"

import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { deleteCustomer, getCustomers } from "../api/customers"

import { ConfirmDialog } from "../components/ConfirmDialog"
import { CustomerFormModal } from "../components/CustomerFormModal"
import { CustomerSummaryModal } from "../components/CustomerSummaryModal"
import { Notice } from "../components/Notice"
import { Pagination } from "../components/Pagination"

import { useNotice } from "../hooks/useNotice"

import type { Customer } from "../types"

import { formatCurrency, normalizeText } from "../utils/format"
import { formatPhone } from "../utils/sales"

const PAGE_SIZE = 15

const inputClass = "ui-input"

function formatLastPurchase(customer: Customer): string {
    return customer.last_purchase_at
        ? new Date(customer.last_purchase_at).toLocaleDateString("pt-BR")
        : "—"
}

export function CustomersPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const search = searchParams.get("q") ?? ""
    const onlyOpen = searchParams.get("filter") === "open"

    const [customers, setCustomers] = useState<Customer[]>([])
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [showForm, setShowForm] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
    const [summaryCustomerId, setSummaryCustomerId] = useState<number | null>(null)
    const summaryCustomer = customers.find((customer) => customer.id === summaryCustomerId) ?? null
    const { notice, showNotice } = useNotice()

    function setFilter(key: string, value: string) {
        const next = new URLSearchParams(searchParams)

        if (value) {
            next.set(key, value)
        } else {
            next.delete(key)
        }

        setSearchParams(next, { replace: true })
        setPage(1)
    }

    async function loadData() {
        try {
            setCustomers(await getCustomers())
            setError(null)
        } catch {
            setError("Não foi possível carregar os clientes.")
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const text = normalizeText(search)
    const digits = search.replace(/\D/g, "")

    const filtered = customers.filter((customer) => {
        if (onlyOpen && customer.open_balance <= 0) return false
        if (!text) return true

        return (
            normalizeText(customer.name).includes(text) ||
            (digits !== "" && (customer.phone ?? "").includes(digits))
        )
    })

    const debtors = customers.filter((customer) => customer.open_balance > 0)
    const totalOpen = debtors.reduce((sum, customer) => sum + customer.open_balance, 0)

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const visibleCustomers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    function openCreate() {
        setEditingCustomer(null)
        setShowForm(true)
    }

    function openEdit(customer: Customer) {
        setEditingCustomer(customer)
        setShowForm(true)
    }

    async function handleSaved(message: string) {
        setShowForm(false)
        await loadData()
        showNotice(message)
    }

    async function handleSummaryChanged(message: string) {
        await loadData()
        showNotice(message)
    }

    async function handleDelete() {
        if (!customerToDelete) return
        const name = customerToDelete.name
        setError(null)

        try {
            await deleteCustomer(customerToDelete.id)
            await loadData()
            showNotice(`Cliente "${name}" excluído.`)
        } catch (e) {
            setError(
                isAxiosError(e) && e.response?.status === 400
                    ? `"${name}" tem vendas registradas e não pode ser excluído.`
                    : "Não foi possível excluir o cliente.",
            )
        } finally {
            setCustomerToDelete(null)
        }
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="page-title">Clientes</h1>
                    <p className="text-sm text-slate-500">
                        {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
                    </p>
                </div>
                <button onClick={openCreate} className="btn btn-primary">
                    + Novo cliente
                </button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
                <div className="card p-4 sm:p-5">
                    <p className="text-xs font-medium text-slate-500 sm:text-sm">Clientes cadastrados</p>
                    <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-slate-900 sm:text-2xl">
                        {customers.length}
                    </p>
                </div>
                <div className="card p-4 sm:p-5">
                    <p className="text-xs font-medium text-slate-500 sm:text-sm">
                        Fiado em aberto
                        {debtors.length > 0 && ` · ${debtors.length}`}
                    </p>
                    <p
                        className={`mt-1 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl ${
                            totalOpen > 0 ? "text-amber-700" : "text-slate-900"
                        }`}
                    >
                        {formatCurrency(totalOpen)}
                    </p>
                </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input
                    type="search"
                    placeholder="Buscar por nome ou telefone"
                    value={search}
                    onChange={(e) => setFilter("q", e.target.value)}
                    className={`${inputClass} w-full sm:max-w-sm`}
                />
                <select
                    value={onlyOpen ? "open" : ""}
                    onChange={(e) => setFilter("filter", e.target.value)}
                    className={`${inputClass} w-full sm:w-auto`}
                >
                    <option value="">Todos os clientes</option>
                    <option value="open">Com fiado em aberto</option>
                </select>
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {filtered.length === 0 ? (
                <p className="empty-state">
                    {customers.length === 0
                        ? 'Nenhum cliente ainda. Eles aparecem aqui quando você informa o cliente numa venda, ou crie um em "+ Novo cliente".'
                        : "Nenhum cliente encontrado."}
                </p>
            ) : (
                <>
                    <div className="card hidden overflow-x-auto md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Cliente</th>
                                    <th className="px-4 py-3 text-right font-medium">Compras</th>
                                    <th className="px-4 py-3 text-right font-medium">Total gasto</th>
                                    <th className="px-4 py-3 font-medium">Última compra</th>
                                    <th className="px-4 py-3 text-right font-medium">Em aberto</th>
                                    <th className="px-4 py-3 font-medium">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleCustomers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        onClick={() => setSummaryCustomerId(customer.id)}
                                        className="cursor-pointer hover:bg-slate-50"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-900">{customer.name}</p>
                                            {customer.phone && (
                                                <p className="text-xs text-slate-500">
                                                    {formatPhone(customer.phone)}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                                            {customer.purchases}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                                            {formatCurrency(customer.total_spent)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                            {formatLastPurchase(customer)}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right font-medium tabular-nums ${
                                                customer.open_balance > 0
                                                    ? "text-amber-700"
                                                    : "text-slate-400"
                                            }`}
                                        >
                                            {customer.open_balance > 0
                                                ? formatCurrency(customer.open_balance)
                                                : "—"}
                                        </td>
                                        <td
                                            className="px-4 py-3"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="flex justify-end gap-4 text-sm font-medium">
                                                <button
                                                    onClick={() => openEdit(customer)}
                                                    className="font-medium text-brand-700 hover:text-brand-800"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => setCustomerToDelete(customer)}
                                                    className="font-medium text-red-600 hover:text-red-800"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <ul className="space-y-3 md:hidden">
                        {visibleCustomers.map((customer) => (
                            <li
                                key={customer.id}
                                onClick={() => setSummaryCustomerId(customer.id)}
                                className="card cursor-pointer p-4 transition hover:border-slate-300 active:bg-slate-50"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-900">
                                            {customer.name}
                                        </p>
                                        {customer.phone && (
                                            <p className="text-sm text-slate-500">
                                                {formatPhone(customer.phone)}
                                            </p>
                                        )}
                                    </div>
                                    {customer.open_balance > 0 && (
                                        <span className="badge shrink-0 bg-amber-100 text-amber-700">
                                            deve {formatCurrency(customer.open_balance)}
                                        </span>
                                    )}
                                </div>

                                <p className="mt-2 text-sm text-slate-600">
                                    {customer.purchases} {customer.purchases === 1 ? "compra" : "compras"}{" "}
                                    · {formatCurrency(customer.total_spent)} · última{" "}
                                    {formatLastPurchase(customer)}
                                </p>

                                <div 
                                    className="mt-3 grid grid-cols-2 gap-2 text-sm font-medium"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => openEdit(customer)}
                                        className="btn btn-secondary text-brand-700"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => setCustomerToDelete(customer)}
                                        className="btn btn-danger-outline"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />

            {summaryCustomer && (
                <CustomerSummaryModal
                    customer={summaryCustomer}
                    onClose={() => setSummaryCustomerId(null)}
                    onEdit={() => {
                        setSummaryCustomerId(null)
                        openEdit(summaryCustomer)
                    }}
                    onChanged={handleSummaryChanged}
                />
            )}

            <CustomerFormModal
                open={showForm}
                customer={editingCustomer}
                onClose={() => setShowForm(false)}
                onSaved={handleSaved}
            />

            <ConfirmDialog
                open={customerToDelete !== null}
                title="Excluir cliente"
                message={`Tem certeza que deseja excluir "${customerToDelete?.name}"? Clientes com vendas não podem ser excluídos.`}
                onConfirm={handleDelete}
                onCancel={() => setCustomerToDelete(null)}
            />

            <Notice message={notice} />
        </div>
    )
}