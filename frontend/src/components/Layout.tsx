import { NavLink, Outlet } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { BrandLogo } from "./BrandLogo"

const NAV_LINKS = [
    { to: "/", label: "Dashboard", end: true },
    { to: "/sales", label: "Vendas", end: false },
    { to: "/customers", label: "Clientes", end: false },
    { to: "/result", label: "Resultado", end: false },
    { to: "/categories", label: "Categorias", end: false },
    { to: "/products", label: "Produtos", end: false },
    { to: "/stock-movements", label: "Movimentações", end: false },
    { to: "/packagings", label: "Embalagens", end: false },
    
]

export function Layout() {
    const { logout } = useAuth()

    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-sm transition ${
            isActive
                ? "bg-brand-50 font-semibold text-brand-700"
                : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`

    const links = NAV_LINKS.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
            {link.label}
        </NavLink>
    ))

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-8 sm:py-3">
                    <div className="flex min-w-0 items-center gap-6">
                        <span className="shrink-0">
                            <BrandLogo size="md" />
                        </span>

                        <div className="hidden items-center gap-1 lg:flex">{links}</div>
                    </div>

                    <button
                        onClick={logout}
                        className="btn btn-ghost btn-sm -mr-2 text-slate-500 hover:text-red-600"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
                        </svg>
                        Sair
                    </button>
                </div>

                <div className="scroll-fade-x flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:px-7 lg:hidden [&::-webkit-scrollbar]:hidden">
                    {links}
                    <span className="w-6 shrink-0" aria-hidden="true" />
                </div>
            </nav>

            <Outlet />
        </div>
    )
}
