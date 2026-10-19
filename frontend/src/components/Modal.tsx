import { useEffect, type ReactNode } from "react"

interface ModalProps {
    open: boolean
    title: string
    onClose: () => void
    children: ReactNode
    widthClass?: string
}

export function Modal({ open, title, onClose, children, widthClass = "max-w-2xl" }: ModalProps) {
    useEffect(() => {
        if (!open) return

        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") onClose()
        }

        window.addEventListener("keydown", handleKey)
        return () => window.removeEventListener("keydown", handleKey)
    }, [open, onClose])

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                className={`my-8 w-full ${widthClass} rounded-lg bg-white p-6 shadow-xl`}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <button
                        onClick={onClose}
                        aria-label="Fechar"
                        className="text-slate-400 hover:text-slate-600"
                    >
                        X
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}