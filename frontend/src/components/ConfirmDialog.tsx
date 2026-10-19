import { useEffect } from "react"

interface ConfirmDialogProps {
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "Excluir",
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    useEffect(() => {
        if (!open) return

        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") onCancel()
        }

        window.addEventListener("keydown", handleKey)
        return () => window.removeEventListener("keydown", handleKey)
    }, [open, onCancel])

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onClick={onCancel}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-sm rounded-lg bg-white p-6 shadow-x1"
                onClick={(event) => event.stopPropagation()}
            >
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                <p className="mt-2 text-sm text-slate-600">{message}</p>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}