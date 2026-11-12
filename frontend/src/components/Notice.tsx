export function Notice({ message }: {message: string | null}) {
    if (!message) return null

    return (
        <div className="fixed inset-x-4 bottom-4 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg sm:inset-x-auto sm:right-6 sm:bottom-6">
            {message}
        </div>
    )
}