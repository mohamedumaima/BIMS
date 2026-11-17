import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import CustomersPage from './pages/CustomersPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ReportsPage from './pages/ReportsPage';
import SettingsUsersPage from './pages/SettingsUsersPage';
import ShipmentsPage from './pages/ShipmentsPage';
import SuppliersPage from './pages/SuppliersPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/transactions" element={<ShipmentsPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={<SettingsUsersPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
