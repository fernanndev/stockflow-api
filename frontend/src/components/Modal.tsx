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
            className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-[2px] sm:items-start sm:p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                className={`mt-12 w-full ${widthClass} rounded-t-2xl bg-surface px-4 pt-3 pb-6 shadow-xl sm:my-10 sm:rounded-2xl sm:p-6`}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
                    <button
                        onClick={onClose}
                        aria-label="Fechar"
                        className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:h-9 sm:w-9"
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}
