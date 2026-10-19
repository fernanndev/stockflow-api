export function Notice({ message }: {message: string | null}) {
    if (!message) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
            {message}
        </div>
    )
}