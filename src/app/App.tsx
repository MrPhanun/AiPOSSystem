import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '../features/auth/LoginPage'
import RequireAuth from '../features/auth/RequireAuth'
import { homeFor, useAuth } from '../features/auth/AuthContext'
import AppLayout from '../components/AppLayout'
import UsersPage from '../features/users/UsersPage'
import PosPage from '../features/pos/PosPage'
import { ForbiddenPage, NotFoundPage } from '../pages/Placeholders'
import DashboardPage from '../features/dashboard/DashboardPage'
import ProductsPage from '../features/products/ProductsPage'
import InventoryPage from '../features/inventory/InventoryPage'
import SalesPage from '../features/sales/SalesPage'
import CustomersPage from '../features/customers/CustomersPage'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/pos" element={<PosPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route element={<RequireAuth roles={['admin']} />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/inventory" element={<InventoryPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
