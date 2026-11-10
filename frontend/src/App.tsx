import { Routes, Route } from "react-router-dom"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { Layout } from "./components/Layout"
import { LoginPage } from "./pages/LoginPage"
import { DashboardPage } from "./pages/DashboardPage"
import { CategoriesPage } from "./pages/Categories"
import { ProductsPage } from "./pages/ProductsPage"
import { StockMovementsPage } from "./pages/StockMovementsPage"
import { PackagingsPage } from "./pages/PackagingsPage"
import { SalesPage } from "./pages/SalesPage"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/stock-movements" element={<StockMovementsPage />} />
          <Route path="/packagings" element={<PackagingsPage />} />
          <Route path="/sales" element={<SalesPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
