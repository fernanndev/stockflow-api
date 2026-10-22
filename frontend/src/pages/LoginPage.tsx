import { useState, type FormEvent } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { BrandLogo } from "../components/BrandLogo"

import axios from "axios"

const inputClass = 
    "mb-4 w-full rounded border border-slate-300 px-3 py-2 text-base sm:text-sm"
const labelClass = "mb-1 block text-sm font-medium text-slate-700"

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
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                setError("E-mail ou senha incorretos.")
            } else if (axios.isAxiosError(err) && !err.response) {
                setError("Não foi possível conectar ao servidor. Verifique a conexão.")
            } else {
                setError("Não foi possível entrar. Tente novamente")
            }
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
                <h1 className="sr-only">StockFlow</h1>
                <div className="mb-2">
                    <BrandLogo size="lg"/>
                </div>
                <p className="mb-6 mt-1 text-sm text-slate-500">
                    Entre para gerenciar seu estoque
                </p>

                <label className={labelClass}>E-mail</label>
                <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                />

                <label className={labelClass}>Senha</label>
                <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={inputClass}
                />

                {expired && !error && (
                    <p className="mb-4 text-sm text-amber-700">
                        Sua sessão expirou. Entre novamente.
                    </p>
                )}

                {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    className="w-full rounded bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                    Entrar
                </button>

            </form>
        </div>
    )
}