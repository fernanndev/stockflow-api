import { useEffect, useState } from "react"
import { deletePackaging, getPackagings } from "../api/packagings"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { Notice } from "../components/Notice"
import { PackagingFormModal } from "../components/PackagingFormModal"
import { PackagingPurchaseModal } from "../components/PackagingPurchaseModal"
import { PackagingSummaryModal } from "../components/PackagingSummaryModal"
import { useNotice } from "../hooks/useNotice"
import type { Packaging } from "../types"
import { formatCurrency, formatUnitCost } from "../utils/format"
import { getImageUrl } from "../utils/image"

function PackagingThumb({ packaging }: {packaging: Packaging}) {
    const src = getImageUrl(packaging.image_url)

    if (!src) {
        return (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-sm font-medium text-slate-400">
                {packaging.name.charAt(0).toUpperCase()}
            </div>
        )
    }

    return (
        <img
            src={src}
            alt={packaging.name}
            className="h-10 w-10 shrink-0 rounded border border-slate-200 object-cover"
        />
    )
}

export function PackagingsPage() {
    const [packagings, setPackagings] = useState<Packaging[]>([])
    const [error, setError] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [editingPackaging, setEditingPackaging] = useState<Packaging | null>(null)
    const [purchasingPackaging, setPurchasingPackaging] = useState<Packaging | null>(null)
    const [summaryPackagingId, setSummaryPackagingId] = useState<number | null>(null)
    const summaryPackaging = packagings.find((packaging) => packaging.id === summaryPackagingId) ?? null
    const [packagingToDelete, setPackagingToDelete] = useState<Packaging | null>(null)
    const { notice, showNotice } = useNotice()

    async function loadData() {
        try {
            setPackagings(await getPackagings())
        } catch {
            setError("Não foi possível carregar as embalagens.")
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    function openCreate() {
        setEditingPackaging(null)
        setShowForm(true)
    }

    function openEdit(packaging: Packaging) {
        setEditingPackaging(packaging)
        setShowForm(true)
    }

    async function handleSaved(message: string) {
        setShowForm(false)
        await loadData()
        showNotice(message)
    }

    async function handlePurchaseSaved(message: string) {
        setPurchasingPackaging(null)
        await loadData()
        showNotice(message)
    }

    async function handleDelete() {
        if (!packagingToDelete) return
        const name = packagingToDelete.name
        setError(null)

        try {
            await deletePackaging(packagingToDelete.id)
            await loadData()
            showNotice(`Embalagem "${name}" excluída.`)
        } catch {
            setError ("Não foi possível excluir a embalagem.")
        } finally {
            setPackagingToDelete(null)
        }
    }

    return (
        <div className="mx-auto max-w-6xl p-4 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                        Embalagens
                    </h1>
                    <p className="text-sm text-slate-500">
                        {packagings.length} {packagings.length === 1 ? "embalagem" : "embalagens"}
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="whitespace-nowrap rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                    + Nova embalagem
                </button>
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {packagings.length === 0? (
                <p className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                    Nenhuma embalagem cadastrada. Crie a primeira em "+ Nova embalagem"
                </p>
            ): (
                <>
                    <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Embalagem</th>
                                    <th className="px-4 py-3 font-medium">Estoque</th>
                                    <th className="px-4 py-3 font-medium">Custo por unidade</th>
                                    <th className="px-4 py-3 font-medium">Valor em estoque</th>
                                    <th className="px-4 py-3 font-medium">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {packagings.map((packaging) => (
                                    <tr key={packaging.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <PackagingThumb packaging={packaging} />
                                                <button
                                                    type="button"
                                                    onClick={() => setSummaryPackagingId(packaging.id)}
                                                    className="text-left font-medium text-slate-900 hover:text-brand-700 hover:underline"
                                                >
                                                    {packaging.name}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {packaging.stock_quantity} un
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {formatUnitCost(packaging.unit_cost)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {formatCurrency(
                                                packaging.stock_quantity * packaging.unit_cost,
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-4 text-sm font-medium">
                                                <button
                                                    onClick={() => setPurchasingPackaging(packaging)}
                                                    className="text-brand-600 hover:text-brand-700"
                                                >
                                                    Registrar compra
                                                </button>
                                                <button
                                                    onClick={() => openEdit(packaging)}
                                                    className="text-brand-600 hover:text-brand-700"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => setPackagingToDelete(packaging)}
                                                    className="text-red-600 hover:text-red-800"
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
                        {packagings.map((packaging) => (
                            <li
                                key={packaging.id}
                                className="rounded-lg border border-slate-200 bg-white p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <PackagingThumb packaging={packaging} />
                                    <div className="min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => setSummaryPackagingId(packaging.id)}
                                            className="block max-w-full truncate text-left font-medium text-slate-900 hover:text-brand-700 hover:underline"
                                        >
                                            {packaging.name}
                                        </button>
                                        <p className="text-sm text-slate-500">
                                            {packaging.stock_quantity} un ·{" "}
                                            {formatUnitCost(packaging.unit_cost)} cada
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-2 text-sm font-medium">
                                    <button
                                        onClick={() => setPurchasingPackaging(packaging)}
                                        className="w-full rounded bg-brand-600 py-2.5 text-white hover:bg-brand-700"
                                    >
                                        Registrar compra
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => openEdit(packaging)}
                                            className="rounded border border-slate-300 py-2.5 text-brand-700 hover:bg-slate50"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => setPackagingToDelete(packaging)}
                                            className="rounded border border-red-200 py-2.5 text-red-600 hover:bg-red-50"
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {summaryPackaging && (
                <PackagingSummaryModal
                    packaging={summaryPackaging}
                    onClose={() => setSummaryPackagingId(null)}
                    onPurchase={() => {
                        setSummaryPackagingId(null)
                        setPurchasingPackaging(summaryPackaging)
                    }}
                    onEdit={() => {
                        setSummaryPackagingId(null)
                        openEdit(summaryPackaging)
                    }}
                />
            )}

            <PackagingFormModal 
                open={showForm}
                packaging={editingPackaging}
                onClose={() => setShowForm(false)}
                onSaved={handleSaved}
            />

            <PackagingPurchaseModal 
                open={purchasingPackaging !== null}
                packaging={purchasingPackaging}
                onClose={() => setPurchasingPackaging(null)}
                onSaved={handlePurchaseSaved}
            />

            <ConfirmDialog 
                open={packagingToDelete !== null}
                title="Excluir embalagem"
                message={`Tem certeza que deseja excluir "${packagingToDelete?.name}"? Esta ação não pode ser desfeita.`}
                onConfirm={handleDelete}
                onCancel={() => setPackagingToDelete(null)}
            />

            <Notice message={notice} />
        </div>
    )
}