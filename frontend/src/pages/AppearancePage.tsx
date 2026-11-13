import { useRef, useState, type CSSProperties } from "react"
import axios from "axios"
import { deleteStoreLogo, updateStore, uploadStoreLogo } from "../api/store"
import { Notice } from "../components/Notice"
import { useStore } from "../context/storeContext"
import { useNotice } from "../hooks/useNotice"
import { getImageUrl } from "../utils/image"
import {
    BACKGROUND_PRESETS,
    DEFAULT_STORE,
    PRIMARY_SUGGESTIONS,
    SURFACE_PRESETS,
    effectivePrimary,
    themeVariables,
} from "../utils/theme"

const MAX_LOGO_BYTES = 5 * 1024 * 1024
const HEX = /^#[0-9a-fA-F]{6}$/

interface Draft {
    name: string
    primary: string
    background: string
    surface: string
}

function SwatchPicker({
    label,
    options,
    value,
    onChange,
}: {
    label: string
    options: { label: string; value: string }[]
    value: string
    onChange: (value: string) => void
}) {
    return (
        <div className="flex flex-wrap gap-2.5" role="group" aria-label={label}>
            {options.map((option) => {
                const selected = option.value.toLowerCase() === value.toLowerCase()

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        aria-pressed={selected}
                        title={option.label}
                        className={`flex flex-col items-center gap-1 text-[11px] ${
                            selected ? "font-semibold text-slate-900" : "text-slate-500"
                        }`}
                    >
                        <span
                            style={{ backgroundColor: option.value }}
                            className={`block h-10 w-10 rounded-full border transition ${
                                selected
                                    ? "border-brand-700 ring-2 ring-brand-700 ring-offset-2"
                                    : "border-slate-300 hover:border-slate-400"
                            }`}
                        />
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}

export function AppearancePage() {
    const { store, setStore } = useStore()
    const { notice, showNotice } = useNotice()
    const fileInput = useRef<HTMLInputElement>(null)

    // what the user changed and did not save yet; empty means "same as saved"
    const [edits, setEdits] = useState<Partial<Draft>>({})
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [logoError, setLogoError] = useState<string | null>(null)

    const draft: Draft = {
        name: edits.name ?? store.name,
        primary: edits.primary ?? store.primary_color,
        background: edits.background ?? store.background_color,
        surface: edits.surface ?? store.surface_color,
    }

    function change(field: keyof Draft, value: string) {
        setEdits((current) => ({ ...current, [field]: value }))
    }

    const primaryValid = HEX.test(draft.primary)
    const nameValid = draft.name.trim().length > 0 && draft.name.trim().length <= 100
    const usedPrimary = primaryValid ? draft.primary.toLowerCase() : store.primary_color
    const adjustedPrimary = primaryValid ? effectivePrimary(usedPrimary) : usedPrimary
    const wasAdjusted = adjustedPrimary.toLowerCase() !== usedPrimary

    const dirty =
        draft.name.trim() !== store.name ||
        draft.primary.toLowerCase() !== store.primary_color ||
        draft.background.toLowerCase() !== store.background_color ||
        draft.surface.toLowerCase() !== store.surface_color

    const previewStyle = themeVariables({
        primary_color: usedPrimary,
        background_color: draft.background,
        surface_color: draft.surface,
    }) as CSSProperties

    const logoUrl = getImageUrl(store.logo_url)

    async function handleSave() {
        setError(null)
        setSaving(true)

        try {
            const saved = await updateStore({
                name: draft.name.trim(),
                primary_color: usedPrimary,
                background_color: draft.background.toLowerCase(),
                surface_color: draft.surface.toLowerCase(),
            })

            setStore(saved)
            setEdits({})
            showNotice("Aparência salva.")
        } catch {
            setError("Não foi possível salvar a aparência. Tente novamente.")
        } finally {
            setSaving(false)
        }
    }

    function resetColors() {
        setEdits((current) => ({
            ...current,
            primary: DEFAULT_STORE.primary_color,
            background: DEFAULT_STORE.background_color,
            surface: DEFAULT_STORE.surface_color,
        }))
    }

    async function handleLogoFile(file: File | null) {
        if (!file) return

        setLogoError(null)

        if (file.size > MAX_LOGO_BYTES) {
            setLogoError("A imagem é grande demais. O limite é 5 MB.")
            return
        }

        setUploading(true)

        try {
            setStore(await uploadStoreLogo(file))
            showNotice("Logo atualizada.")
        } catch (err) {
            const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null
            setLogoError(
                typeof detail === "string"
                    ? "Envie uma imagem JPG, PNG ou WebP de até 5 MB."
                    : "Não foi possível enviar a logo. Tente novamente.",
            )
        } finally {
            setUploading(false)

            if (fileInput.current) fileInput.current.value = ""
        }
    }

    async function handleRemoveLogo() {
        setLogoError(null)
        setUploading(true)

        try {
            setStore(await deleteStoreLogo())
            showNotice("Logo removida.")
        } catch {
            setLogoError("Não foi possível remover a logo. Tente novamente.")
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-6">
                <h1 className="page-title">Aparência da loja</h1>
                <p className="text-sm text-slate-500">
                    Nome, logo e cores que aparecem no sistema e na tela de login.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
                <div className="space-y-6 lg:order-1">
                    <section className="card space-y-5 p-5 sm:p-6">
                        <h2 className="text-base font-semibold text-slate-900">Identidade</h2>

                        <div>
                            <label htmlFor="store-name" className="ui-label">
                                Nome da loja
                            </label>
                            <input
                                id="store-name"
                                value={draft.name}
                                onChange={(e) => change("name", e.target.value)}
                                maxLength={100}
                                className="ui-input w-full"
                            />
                            {!nameValid && (
                                <p className="mt-1 text-xs text-red-600">Informe o nome da loja.</p>
                            )}
                        </div>

                        <div>
                            <p className="ui-label">Logo</p>
                            <div className="flex items-center gap-4">
                                <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-400">
                                    {logoUrl ? (
                                        <img
                                            src={logoUrl}
                                            alt="Logo atual"
                                            className="h-full w-full object-contain p-1"
                                        />
                                    ) : (
                                        "Sem logo"
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <input
                                        ref={fileInput}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        disabled={uploading}
                                        onClick={() => fileInput.current?.click()}
                                        className="btn btn-secondary btn-sm"
                                    >
                                        {uploading
                                            ? "Enviando..."
                                            : logoUrl
                                              ? "Trocar logo"
                                              : "Enviar logo"}
                                    </button>
                                    {logoUrl && (
                                        <button
                                            type="button"
                                            disabled={uploading}
                                            onClick={handleRemoveLogo}
                                            className="btn btn-danger-outline btn-sm"
                                        >
                                            Remover
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                JPG, PNG ou WebP, até 5 MB. Uma imagem quadrada ou horizontal,
                                de preferência PNG com fundo transparente, fica melhor no topo.
                                A logo é salva assim que você a envia.
                            </p>
                            {logoError && <p className="mt-1 text-sm text-red-600">{logoError}</p>}
                        </div>
                    </section>

                    <section className="card space-y-5 p-5 sm:p-6">
                        <h2 className="text-base font-semibold text-slate-900">Cores</h2>

                        <div>
                            <p className="ui-label">Cor principal</p>
                            <p className="mb-3 text-xs text-slate-500">
                                Usada nos botões, nos destaques e no menu. Pode ser qualquer cor.
                            </p>

                            <div className="mb-3 flex flex-wrap items-center gap-3">
                                <input
                                    type="color"
                                    aria-label="Escolher a cor principal"
                                    value={primaryValid ? draft.primary.toLowerCase() : usedPrimary}
                                    onChange={(e) => change("primary", e.target.value)}
                                    className="h-11 w-14 cursor-pointer rounded-lg border border-slate-300 bg-surface p-1"
                                />
                                <input
                                    value={draft.primary}
                                    onChange={(e) => change("primary", e.target.value.trim())}
                                    maxLength={7}
                                    spellCheck={false}
                                    aria-label="Código da cor principal"
                                    className="ui-input w-32 font-mono uppercase"
                                />
                                {!primaryValid && (
                                    <span className="text-xs text-red-600">
                                        Use o formato #RRGGBB, por exemplo #0F766E.
                                    </span>
                                )}
                            </div>

                            <SwatchPicker
                                label="Cores sugeridas"
                                options={PRIMARY_SUGGESTIONS}
                                value={draft.primary}
                                onChange={(value) => change("primary", value)}
                            />

                            {wasAdjusted && (
                                <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                                    <span
                                        aria-hidden="true"
                                        style={{ backgroundColor: adjustedPrimary }}
                                        className="block h-5 w-5 shrink-0 rounded-full border border-amber-300"
                                    />
                                    Essa cor é clara demais para o texto branco dos botões. O
                                    sistema vai usar um tom um pouco mais escuro para o texto
                                    continuar legível.
                                </p>
                            )}
                        </div>

                        <div>
                            <p className="ui-label">Fundo da página</p>
                            <SwatchPicker
                                label="Fundo da página"
                                options={BACKGROUND_PRESETS}
                                value={draft.background}
                                onChange={(value) => change("background", value)}
                            />
                        </div>

                        <div>
                            <p className="ui-label">Cartões, formulários e menus</p>
                            <SwatchPicker
                                label="Cartões, formulários e menus"
                                options={SURFACE_PRESETS}
                                value={draft.surface}
                                onChange={(value) => change("surface", value)}
                            />
                        </div>

                        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                            <strong className="font-semibold text-slate-700">
                                Por que só tons claros no fundo e nos cartões?
                            </strong>{" "}
                            Todo o texto do sistema é escuro. Um fundo escuro deixaria letras e
                            números difíceis de ler, então oferecemos só tons claros. A cor
                            principal continua livre.
                        </p>
                    </section>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex flex-wrap items-center justify-end gap-3">
                        {dirty && (
                            <span className="mr-auto text-xs text-amber-700">
                                Alterações ainda não salvas.
                            </span>
                        )}
                        <button type="button" onClick={resetColors} className="btn btn-ghost">
                            Restaurar cores padrão
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!dirty || !primaryValid || !nameValid || saving}
                            className="btn btn-primary"
                        >
                            {saving ? "Salvando..." : "Salvar aparência"}
                        </button>
                    </div>
                </div>

                <aside className="sticky top-[4.5rem] z-20 order-first lg:top-24 lg:order-2">
                    <p className="mb-2 hidden text-xs font-medium tracking-wide text-slate-500 uppercase lg:block">
                        Pré-visualização
                    </p>

                    <div
                        style={previewStyle}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-app"
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 bg-surface px-4 py-3">
                            <PreviewBrand name={draft.name.trim() || "Minha loja"} logoUrl={logoUrl} />
                            <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                                Vendas
                            </span>
                        </div>

                        <div className="space-y-3 p-3 lg:p-4">
                            <div className="card hidden p-4 lg:block">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-900">Venda #1024</p>
                                    <span className="badge bg-brand-100 text-brand-800">Pago</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">2 itens · Maria</p>
                                <p className="mt-2 text-lg font-bold text-slate-900">R$ 189,90</p>
                            </div>

                            <div className="flex gap-2">
                                <span className="btn btn-primary btn-sm flex-1">+ Nova venda</span>
                                <span className="btn btn-secondary btn-sm flex-1">Cancelar</span>
                            </div>

                            <p className="hidden text-xs text-slate-500 lg:block">
                                Veja mais em{" "}
                                <span className="font-medium text-brand-700">Resultado</span>
                            </p>
                        </div>
                    </div>
                </aside>
            </div>

            <Notice message={notice} />
        </div>
    )
}

// the saved logo is shown, but the name follows what is being typed
function PreviewBrand({ name, logoUrl }: { name: string; logoUrl: string | null }) {
    return (
        <span className="inline-flex min-w-0 items-center gap-2">
            {logoUrl ? (
                <img src={logoUrl} alt="" className="h-9 max-w-[6rem] shrink-0 rounded-md object-contain" />
            ) : (
                <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white"
                >
                    {name.charAt(0).toUpperCase()}
                </span>
            )}
            <span className="truncate text-base font-bold tracking-tight text-slate-900">{name}</span>
        </span>
    )
}
