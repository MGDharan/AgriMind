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
import { SoilPage, IrrigationPage } from './pages/Soil';
import { MarketPage, SchemesPage } from './pages/Market';
import { KnowledgePage, HistoryPage } from './pages/Knowledge';
import { FarmsPage } from './pages/Farms';
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
        <div className="w-8 h-8 border-2 border-moss-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/weather" element={<WeatherPage />} />
        <Route path="/soil" element={<SoilPage />} />
        <Route path="/irrigation" element={<IrrigationPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/schemes" element={<SchemesPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/farms" element={<FarmsPage />} />
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
