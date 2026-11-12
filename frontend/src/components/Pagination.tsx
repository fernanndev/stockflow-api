interface PaginationProps {
    page: number
    totalPages: number
    onChange: (page: number) => void
}

const buttonClass = "btn btn-secondary btn-sm"

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
    if (totalPages <= 1) return null

    return (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
                Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onChange(page - 1)}
                    disabled={page === 1}
                    className={buttonClass}
                >
                    Anterior
                </button>
                <button
                    type="button"
                    onClick={() => onChange(page + 1)}
                    disabled={page === totalPages}
                    className={buttonClass}
                >
                    Próxima
                </button>
            </div>
        </div>
    )
}
