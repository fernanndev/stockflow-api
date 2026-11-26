import { useState, type FormEvent } from "react"
import axios from "axios"

import { changePassword } from "../api/auth"
import { Notice } from "../components/Notice"
import { useNotice } from "../hooks/useNotice"

function errorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const detail = error.response?.data?.detail

        if (status === 429) return "Muitas tentativas erradas. Aguarde alguns minutos e tente de novo."
        if (detail === "Current password is incorrect.") return "A senha atual está incorreta."
        if (typeof detail === "string" && detail.startsWith("The new password must be different")) {
            return "A nova senha precisa ser diferente da atual."
        }
    }

    return "Não foi possível alterar a senha. Tente novamente."
}

export function ChangePasswordPage() {
    const [current, setCurrent] = useState("")
    const [next, setNext] = useState("")
    const [repeat, setRepeat] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { notice, showNotice } = useNotice()

    const tooShort = next.length > 0 && next.length < 8
    const mismatch = repeat.length > 0 && repeat !== next
    const canSave = current !== "" && next.length >= 8 && repeat === next && !saving

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)
        setSaving(true)

        try {
            await changePassword(current, next)

            setCurrent("")
            setNext("")
            setRepeat("")
            showNotice("Senha alterada.")
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mx-auto max-w-md px-4 py-6 sm:px-8 sm:py-8">
            <h1 className="page-title">Alterar minha senha</h1>
            <p className="mt-1 mb-6 text-sm text-slate-500">
                Use pelo menos 8 caracteres. Se mais de uma pessoa entra com este mesmo login,
                avise todas sobre a senha nova.
            </p>

            <form onSubmit={handleSubmit} className="card space-y-4 p-5 sm:p-6">
                <div>
                    <label htmlFor="current-password" className="ui-label">
                        Senha atual
                    </label>
                    <input
                        id="current-password"
                        type="password"
                        autoComplete="current-password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        className="ui-input w-full"
                    />
                </div>

                <div>
                    <label htmlFor="new-password" className="ui-label">
                        Senha nova
                    </label>
                    <input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                        className="ui-input w-full"
                    />
                    {tooShort && (
                        <p className="mt-1 text-xs text-red-600">Use pelo menos 8 caracteres.</p>
                    )}
                </div>

                <div>
                    <label htmlFor="repeat-password" className="ui-label">
                        Repita a senha nova
                    </label>
                    <input
                        id="repeat-password"
                        type="password"
                        autoComplete="new-password"
                        value={repeat}
                        onChange={(e) => setRepeat(e.target.value)}
                        className="ui-input w-full"
                    />
                    {mismatch && (
                        <p className="mt-1 text-xs text-red-600">As senhas não são iguais.</p>
                    )}
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end">
                    <button type="submit" disabled={!canSave} className="btn btn-primary">
                        {saving ? "Salvando..." : "Alterar senha"}
                    </button>
                </div>
            </form>

            <Notice message={notice} />
        </div>
    )
}
