import { NavLink, Outlet } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export function Layout() {
    const { logout } = useAuth()

    const linkClass = ({ isActive }: {isActive: boolean}) =>
        isActive ? "font-semibold text-vlue-600" : "text-gray-600 hover:text-gray-900"

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="flex items-center justify-between bg-white px-8 py-4 shadow">
                <div className="flex gap-6">
                    <NavLink to="/" end className={linkClass}>
                        Dashboard
                    </NavLink>
                    <NavLink to="/categories" className={linkClass}>
                        Categorias
                    </NavLink>
                    <NavLink to="/products" className={linkClass}>
                         Produtos   
                    </NavLink>
                    <NavLink to="stock-movements" className={linkClass}>
                        Estoque
                    </NavLink>
                </div>

                <button
                    onClick={logout}
                    className="text-sm font-medium text-gray-600 hover:text-red-600"
                >   
                    Sair
                </button>
            </nav>

            <Outlet />
        </div>
    )    
}