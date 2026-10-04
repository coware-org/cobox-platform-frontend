import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { AuthLayout, DashboardLayout, DriverLayout } from '@/components/layouts';
import { LoginPage, RegisterPage } from '@/features/auth';
import { DashboardPage } from '@/features/dashboard';
import { SmartVisionPage } from '@/features/smartvision';
import { EvidenceAnalysesPage } from '@/features/evidence-analyses';
import { VehiclesPage } from '@/features/vehicles';
import { DriversPage } from '@/features/drivers';
import { OrdersPage } from '@/features/orders';
import { RoutesPage } from '@/features/routes';
import { IncidentsPage } from '@/features/incidents';
import { MaintenancePage } from '@/features/maintenance';
import { ReportsPage } from '@/features/reports';
import { ProfilePage } from '@/features/profile';
import { SettingsPage } from '@/features/settings';
import { SupportPage, TicketDetailPage } from '@/modules/support';

function RootRedirect() {
  const { isLoading, isAuthenticated } = useAuth0();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Cargando...</p>
      </div>
    );
  }
  return isAuthenticated ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/auth/login" replace />
  );
}

/**
 * La bandeja de alertas vive en SmartVision IA. `/alerts` se conserva solo
 * como alias para no romper enlaces profundos (por ejemplo `?alertId=`),
 * reenviando la query string completa.
 */
function AlertsRedirect() {
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();

  return <Navigate to={{ pathname: '/smartvision', search }} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/smartvision" element={<SmartVisionPage />} />
        <Route path="/alerts" element={<AlertsRedirect />} />
        <Route path="/evidence-analyses" element={<EvidenceAnalysesPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/routes" element={<RoutesPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/support/:id" element={<TicketDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/driver" element={<DriverLayout />}>
        <Route index element={<OrdersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
