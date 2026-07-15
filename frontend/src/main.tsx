import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { LoginPage, RegisterPage } from './pages/Auth';
import { DashboardPage } from './pages/Dashboard';
import { ScanPage } from './pages/Scan';
import { WeatherPage } from './pages/Weather';
import { SoilPage } from './pages/Soil';
import { MarketPage, SchemesPage } from './pages/Market';
import TradePage from './pages/Trade';
import OrdersPage from './pages/Orders';
import { KnowledgePage, HistoryPage } from './pages/Knowledge';
import { FarmsPage } from './pages/Farms';
import { AdvisorPage } from './pages/Advisor';
import { AdminLoginPage, AdminDashboardPage } from './pages/Admin';
import './styles/index.css';
import 'leaflet/dist/leaflet.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-950">
        <div className="relative">
          <div className="w-10 h-10 border-2 border-moss-500/30 rounded-full" />
          <div className="w-10 h-10 border-2 border-moss-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
        </div>
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-950">
        <div className="relative">
          <div className="w-10 h-10 border-2 border-moss-500/30 rounded-full" />
          <div className="w-10 h-10 border-2 border-moss-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
        </div>
      </div>
    );
  }
  return user?.is_admin ? <>{children}</> : <Navigate to="/admin/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/weather" element={<WeatherPage />} />
        <Route path="/soil" element={<SoilPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/trade" element={<TradePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/schemes" element={<SchemesPage />} />
        <Route path="/farms" element={<FarmsPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/advisor" element={<AdvisorPage />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
