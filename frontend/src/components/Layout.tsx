import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { BrandLogo } from "./BrandLogo"
import { Icon, type IconName } from "./Icon"

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
                <div className="absolute left-0 z-40 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
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

export function Layout() {
    const { logout } = useAuth()
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
        <div className="min-h-screen bg-slate-50">
            <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-8 sm:py-3">
                    <div className="flex min-w-0 items-center gap-6">
                        <Link to="/" aria-label="Ir para o Dashboard" className="shrink-0">
                            <BrandLogo size="md" />
                        </Link>

                        <div className="hidden items-center gap-1 lg:flex">
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

                    <div className="hidden items-center gap-2 lg:flex">
                        <Link to="/sales/new" className="btn btn-primary btn-sm">
                            + Nova venda
                        </Link>
                        <button
                            onClick={logout}
                            className="btn btn-ghost btn-sm text-slate-500 hover:text-red-600"
                        >
                            <Icon name="logout" className="h-4 w-4" />
                            Sair
                        </button>
                    </div>
                </div>
            </nav>

            <div className={showBottomBar ? "pb-20 sm:pb-28 lg:pb-0" : ""}>
                <Outlet />
            </div>

            {showBottomBar && (
                <nav
                    aria-label="Menu principal"
                    className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:hidden"
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
                                className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg ring-4 ring-white transition active:bg-brand-800 sm:-mt-7 sm:h-[4.5rem] sm:w-[4.5rem]"
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
                    className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 lg:hidden"
                    onClick={() => setMoreOpen(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Mais opções"
                        className="w-full max-w-2xl rounded-t-2xl bg-white px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl sm:px-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
                        <p className="mb-3 text-sm font-semibold text-slate-900 sm:text-base">
                            Mais opções
                        </p>

                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
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
                            <BrandLogo size="sm" />
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
