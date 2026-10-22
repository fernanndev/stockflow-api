import { NavLink, Outlet } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { BrandLogo } from "./BrandLogo"

const NAV_LINKS = [
    { to: "/", label: "Dashboard", end: true },
    { to: "/categories", label: "Categorias", end: false },
    { to: "/products", label: "Produtos", end: false },
    { to: "/stock-movements", label: "Estoque", end: false },
]

export function Layout() {
    const { logout } = useAuth()

    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `whitespace-nowrap border-b-2 pb-1 ${
            isActive
                ? "border-brand-600 font-medium text-brand-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
        }`

    const links = NAV_LINKS.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
            {link.label}
        </NavLink>
    ))

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8 sm:py-4">
                    <div className="flex items-center gap-8">
                        <span className="text-lg font-semibold tracking-tight text-brand-700">
                            <BrandLogo size="md" />
                        </span>
                        
                        <div className="hidden gap-6 text-sm sm:flex">{links}</div>
                    </div>

                    <button
                        onClick={logout}
                        className="text-sm font-medium text-slate-500 hover:text-red-600"
                    >
                        Sair
                    </button>
                </div>

                <div className="flex gap-6 overflow-x-auto border-t border-slate-100 px-4 pt-3 text-sm sm:hidden">
                    {links}
                </div>
            </nav>

            <Outlet />
        </div>
    )
}