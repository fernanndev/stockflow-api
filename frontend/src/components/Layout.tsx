import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useStore } from "../context/storeContext"
import { BrandLogo } from "./BrandLogo"
import { Icon, type IconName } from "./Icon"
import { NewStoreModal } from "./NewStoreModal"
import { StoreBrand } from "./StoreBrand"
import { StoreTile } from "./StoreTile"

interface NavItem {
    to: string
    label: string
    icon: IconName
    end?: boolean
}

// desktop: always visible in the top bar
const MAIN_LINKS: NavItem[] = [
    { to: "/", label: "Dashboard", icon: "home", end: true },
    { to: "/sales", label: "Vendas", icon: "receipt" },
    { to: "/customers", label: "Clientes", icon: "users" },
    { to: "/result", label: "Resultado", icon: "chart" },
]

// desktop: grouped in the "Estoque" dropdown
const STOCK_LINKS: NavItem[] = [
    { to: "/products", label: "Produtos", icon: "box" },
    { to: "/categories", label: "Categorias", icon: "tag" },
    { to: "/stock-movements", label: "Movimentações", icon: "swap" },
    { to: "/packagings", label: "Embalagens", icon: "package" },
]

// phone: what does not fit in the bottom bar goes to the "Mais" sheet
const MORE_LINKS: NavItem[] = [
    { to: "/customers", label: "Clientes", icon: "users" },
    { to: "/result", label: "Resultado", icon: "chart" },
    { to: "/categories", label: "Categorias", icon: "tag" },
    { to: "/stock-movements", label: "Movimentações", icon: "swap" },
    { to: "/packagings", label: "Embalagens", icon: "package" },
    { to: "/store-settings", label: "Loja", icon: "palette" },
    { to: "/change-password", label: "Senha", icon: "key" },
]

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-sm transition ${
        isActive
            ? "bg-brand-50 font-semibold text-brand-700"
            : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`

// bottom bar tabs: compact on phones, bigger on tablets (sm = 640px and up)
const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition sm:gap-1 sm:py-3 sm:text-sm ${
        isActive ? "text-brand-700" : "text-slate-500"
    }`

const TAB_ICON = "h-5 w-5 sm:h-7 sm:w-7"

function startsWithAny(pathname: string, items: NavItem[]): boolean {
    return items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
}

function StockMenu({ pathname }: { pathname: string }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const active = startsWithAny(pathname, STOCK_LINKS)

    useEffect(() => {
        if (!open) return

        function handleClick(event: MouseEvent) {
            if (!ref.current?.contains(event.target as Node)) setOpen(false)
        }

        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false)
        }

        document.addEventListener("mousedown", handleClick)
        document.addEventListener("keydown", handleKey)

        return () => {
            document.removeEventListener("mousedown", handleClick)
            document.removeEventListener("keydown", handleKey)
        }
    }, [open])

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                className={`inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-lg px-3 text-sm transition ${
                    active
                        ? "bg-brand-50 font-semibold text-brand-700"
                        : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
            >
                Estoque
                <Icon
                    name="chevron"
                    className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <div className="absolute left-0 z-40 mt-2 w-52 rounded-xl border border-slate-200 bg-surface p-1.5 shadow-lg">
                    {STOCK_LINKS.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                                    isActive
                                        ? "bg-brand-50 font-semibold text-brand-700"
                                        : "font-medium text-slate-700 hover:bg-slate-100"
                                }`
                            }
                        >
                            <Icon name={link.icon} className="h-4 w-4" />
                            {link.label}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    )
}

// The store identity in the header. Clicking it opens the stores of the installation
// (to switch between them or add one) and the shortcuts to the home and to the settings.
function StoreMenu() {
    const { store, stores, plan, switchStore } = useStore()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const limitReached = plan !== null && plan.total_stores >= plan.max_stores

    useEffect(() => {
        if (!open) return

        function handleClick(event: MouseEvent) {
            if (!ref.current?.contains(event.target as Node)) setOpen(false)
        }

        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false)
        }

        document.addEventListener("mousedown", handleClick)
        document.addEventListener("keydown", handleKey)

        return () => {
            document.removeEventListener("mousedown", handleClick)
            document.removeEventListener("keydown", handleKey)
        }
    }, [open])

    function choose(id: number) {
        setOpen(false)

        if (id === store.id) return

        switchStore(id)
        navigate("/")
    }

    const itemClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${
            isActive
                ? "bg-brand-50 font-semibold text-brand-700"
                : "font-medium text-slate-700 hover:bg-slate-100"
        }`

    return (
        <div ref={ref} className="relative max-w-[12rem] min-w-0 shrink-0 sm:max-w-[16rem]">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-label="Menu da loja"
                className="flex max-w-full min-w-0 items-center gap-1 rounded-lg py-1 pr-1 transition hover:bg-slate-100"
            >
                <StoreBrand size="md" />
                <Icon
                    name="chevron"
                    className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <div className="absolute left-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-surface p-1.5 shadow-lg">
                    {stores.length > 0 && (
                        <>
                            <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                Suas lojas
                            </p>
                            {stores.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => choose(item.id)}
                                    aria-current={item.id === store.id}
                                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                                        item.id === store.id
                                            ? "bg-brand-50 font-semibold text-brand-700"
                                            : "font-medium text-slate-700 hover:bg-slate-100"
                                    }`}
                                >
                                    <StoreTile store={item} />
                                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                    {item.id === store.id && (
                                        <Icon name="check" className="h-4 w-4 shrink-0" />
                                    )}
                                </button>
                            ))}

                            <button
                                type="button"
                                disabled={limitReached}
                                onClick={() => {
                                    setOpen(false)
                                    setCreating(true)
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-brand-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-dashed border-current">
                                    <Icon name="plus" className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    Nova loja
                                    {limitReached && (
                                        <span className="block text-xs font-normal text-slate-500">
                                            Seu plano permite até {plan?.max_stores} lojas
                                        </span>
                                    )}
                                </span>
                            </button>

                            <div className="my-1.5 border-t border-slate-100" />
                        </>
                    )}

                    <NavLink to="/" end onClick={() => setOpen(false)} className={itemClass}>
                        <Icon name="home" className="h-4 w-4" />
                        Ir para o início
                    </NavLink>
                    <NavLink
                        to="/store-settings"
                        onClick={() => setOpen(false)}
                        className={itemClass}
                    >
                        <Icon name="palette" className="h-4 w-4" />
                        Configurações da loja
                    </NavLink>
                </div>
            )}

            <NewStoreModal
                open={creating}
                onClose={() => setCreating(false)}
                onCreated={() => {
                    setCreating(false)
                    // the new store is already the active one: set its name, logo and colors
                    navigate("/store-settings")
                }}
            />
        </div>
    )
}

export function Layout() {
    const { logout } = useAuth()
    const { store } = useStore()
    const { pathname } = useLocation()
    const [moreOpen, setMoreOpen] = useState(false)

    // the new sale screen has its own bottom bar ("Ver venda")
    const showBottomBar = pathname !== "/sales/new"
    const moreActive = startsWithAny(pathname, MORE_LINKS)

    useEffect(() => {
        if (!moreOpen) return

        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") setMoreOpen(false)
        }

        document.addEventListener("keydown", handleKey)
        return () => document.removeEventListener("keydown", handleKey)
    }, [moreOpen])

    return (
        <div className="min-h-screen bg-app">
            <nav className="sticky top-0 z-30 border-b border-slate-200 bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-8 sm:py-3">
                    <div className="flex min-w-0 items-center gap-6">
                        <StoreMenu />

                        <div className="hidden items-center gap-1 xl:flex">
                            {MAIN_LINKS.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    end={link.end}
                                    className={desktopLinkClass}
                                >
                                    {link.label}
                                </NavLink>
                            ))}
                            <StockMenu pathname={pathname} />
                        </div>
                    </div>

                    <div className="hidden items-center gap-2 xl:flex">
                        <Link to="/sales/new" className="btn btn-primary btn-sm">
                            + Nova venda
                        </Link>
                        <Link
                            to="/change-password"
                            aria-label="Alterar minha senha"
                            title="Alterar minha senha"
                            className="btn btn-ghost btn-sm px-2 text-slate-500"
                        >
                            <Icon name="key" className="h-4 w-4" />
                        </Link>
                        <button
                            onClick={logout}
                            className="btn btn-ghost btn-sm text-slate-500 hover:text-red-600"
                        >
                            <Icon name="logout" className="h-4 w-4" />
                            Sair
                        </button>
                    </div>

                    {/* the system mark: small, on the right, the store identity stays on the left */}
                    <div
                        className="shrink-0 border-l border-slate-200 pl-3 sm:pl-4"
                        title="Sistema StockFlow"
                    >
                        <BrandLogo size="xs" />
                    </div>
                </div>
            </nav>

            <div className={showBottomBar ? "pb-20 sm:pb-28 xl:pb-0" : ""}>
                <Outlet key={store.id} />
            </div>

            {showBottomBar && (
                <nav
                    aria-label="Menu principal"
                    className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] xl:hidden"
                >
                    <div className="mx-auto flex max-w-3xl items-end px-2 sm:px-6">
                        <NavLink to="/" end className={tabClass}>
                            <Icon name="home" className={TAB_ICON} />
                            Início
                        </NavLink>
                        <NavLink to="/sales" end className={tabClass}>
                            <Icon name="receipt" className={TAB_ICON} />
                            Vendas
                        </NavLink>

                        <div className="flex flex-1 justify-center">
                            <Link
                                to="/sales/new"
                                aria-label="Nova venda"
                                className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg ring-4 ring-surface transition active:bg-brand-800 sm:-mt-7 sm:h-[4.5rem] sm:w-[4.5rem]"
                            >
                                <Icon name="plus" className="h-7 w-7 sm:h-9 sm:w-9" />
                            </Link>
                        </div>

                        <NavLink to="/products" className={tabClass}>
                            <Icon name="box" className={TAB_ICON} />
                            Produtos
                        </NavLink>
                        <button
                            type="button"
                            onClick={() => setMoreOpen(true)}
                            className={tabClass({ isActive: moreActive })}
                        >
                            <Icon name="dots" className={TAB_ICON} />
                            Mais
                        </button>
                    </div>
                </nav>
            )}

            {moreOpen && (
                <div
                    className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 xl:hidden"
                    onClick={() => setMoreOpen(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Mais opções"
                        className="w-full max-w-2xl rounded-t-2xl bg-surface px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl sm:px-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
                        <p className="mb-3 text-sm font-semibold text-slate-900 sm:text-base">
                            Mais opções
                        </p>

                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
                            {MORE_LINKS.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    onClick={() => setMoreOpen(false)}
                                    className={({ isActive }) =>
                                        `flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-medium transition sm:gap-2 sm:py-5 sm:text-sm ${
                                            isActive
                                                ? "border-brand-600 bg-brand-50 text-brand-700"
                                                : "border-slate-200 text-slate-700 active:bg-slate-50"
                                        }`
                                    }
                                >
                                    <Icon name={link.icon} className="h-6 w-6 sm:h-8 sm:w-8" />
                                    {link.label}
                                </NavLink>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setMoreOpen(false)
                                logout()
                            }}
                            className="mt-4 flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm sm:py-4 sm:text-base"
                        >
                            <StoreBrand size="sm" />
                            <span className="flex items-center gap-1.5 font-medium text-red-600">
                                <Icon name="logout" className="h-4 w-4" />
                                Sair
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
