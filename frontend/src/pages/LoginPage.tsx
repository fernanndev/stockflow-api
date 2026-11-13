import { useState, type FormEvent } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { BrandLogo } from "../components/BrandLogo"
import { StoreBrand } from "../components/StoreBrand"

import axios from "axios"

const inputClass = 
    "ui-input mb-4 w-full"
const labelClass = "ui-label"

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
        <div className="flex min-h-screen items-center justify-center bg-app px-4">
            <form
                onSubmit={handleSubmit}
                className="card w-full max-w-sm rounded-2xl p-6 shadow-sm sm:p-8"
            >
                <h1 className="sr-only">Entrar</h1>
                <div className="mb-2">
                    <StoreBrand size="lg" />
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
                    className="btn btn-primary w-full"
                >
                    Entrar
                </button>

                <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
                    Sistema
                    <BrandLogo size="xs" />
                </div>
            </form>
        </div>
    )
}