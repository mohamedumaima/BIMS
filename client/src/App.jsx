import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { logout } from './features/auth/authSlice';
import CustomersPage from './pages/CustomersPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsVaultPage from './pages/DocumentsVaultPage';
import InventoryPage from './pages/InventoryPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ReportsPage from './pages/ReportsPage';
import SettingsUsersPage from './pages/SettingsUsersPage';
import ShipmentsPage from './pages/ShipmentsPage';
import SuppliersPage from './pages/SuppliersPage';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleAuthExpired = () => {
      dispatch(logout());
    };
    window.addEventListener('bims:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('bims:auth-expired', handleAuthExpired);
  }, [dispatch]);

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
            <Route path="/documents" element={<DocumentsVaultPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={<SettingsUsersPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
