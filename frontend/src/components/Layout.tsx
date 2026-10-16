import { NavLink, Outlet } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export function Layout () {
    const { logout } = useAuth()

    const linkClass = ({ isActive } : {isActive: boolean}) =>
        isActive
            ? "border-b-2 border-brand-600 pb-1 font-medium text-brand-700"
            : "border-b-2 border-trasnparent pb-1 text-slate-600 hover:text-slate-900"

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
                <div className="flex items-center gap-8">
                    <span className="text-lg font-semibold tracking-tight text-brand-700">
                        StockFlow
                    </span>
                    <div className="flex gap-6 text-sm">
                        <NavLink to="/" end className={linkClass}>
                            Dashboard
                        </NavLink>
                        <NavLink to="/categories" className={linkClass}>
                            Categorias
                        </NavLink>
                        <NavLink to="/products" className={linkClass}>
                            Produtos
                        </NavLink>
                        <NavLink to="/stock-movements" className={linkClass}>
                            Estoque
                        </NavLink>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="text-sm font-medium text-slate-500 hover:text-red-600"
                >
                    Sair
                </button>
            </nav>

            <Outlet  />
        </div>
    )
}