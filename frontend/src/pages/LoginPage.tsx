import { useState, type FormEvent } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const { login } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const expired = searchParams.get("expired") === "1"

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)

        try {
            await login(email, password)
            navigate("/")
        } catch {
            setError("E-mail ou senha incorretos.")
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md"
            >
                <h1 className="mb-6 text-2x1 font-bold text-gray-800">StockFlow</h1>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mb-4 w-full rounded border border-gray-300 px-3 py-2"
                />

                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Password
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mb-4 w-full rounded border-gray-300 px-3 py-2"
                />

                {expired && !error && (
                    <p className="mb-4 text-sm text-amber-700">
                        Sua sessão expirou. Entre novamente.
                    </p>
                )}

                {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
                >
                    Sign in
                </button>
            </form>
        </div>
    )
}