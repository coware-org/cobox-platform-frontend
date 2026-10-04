import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  ScanSearch,
  LayoutDashboard,
  LifeBuoy,
  Map,
  Package,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';

export const sidebarItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'SmartVision IA', path: '/smartvision', icon: BrainCircuit },
  { label: 'Historial de Análisis', path: '/evidence-analyses', icon: ScanSearch },
  { label: 'Vehículos', path: '/vehicles', icon: Truck },
  { label: 'Conductores', path: '/drivers', icon: Users },
  { label: 'Órdenes', path: '/orders', icon: Package },
  { label: 'Rutas', path: '/routes', icon: Map },
  { label: 'Incidentes', path: '/incidents', icon: AlertTriangle },
  { label: 'Mantenimiento', path: '/maintenance', icon: Wrench },
  { label: 'Reportes', path: '/reports', icon: BarChart3 },
  { label: 'Soporte Técnico', path: '/support', icon: LifeBuoy },
] as const;