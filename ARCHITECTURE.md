# CoBox SmartVision (cobox-sv)

## Estructura exacta

```text
src/
  app/
    providers/
      index.ts
    index.ts
  assets/
    icons/
    images/
    logos/
    hero.png
    react.svg
    vite.svg
  components/
    common/
      EmptyState.tsx
      PageHeader.tsx
      index.ts
    forms/
      index.ts
    layouts/
      AuthLayout.tsx
      DashboardLayout.tsx
      DriverLayout.tsx
      Sidebar.tsx
      Topbar.tsx
      index.ts
  config/
    navigation.ts
    index.ts
  features/
    auth/
      components/
        LoginForm.tsx
        index.ts
      hooks/
        useAuth.ts
        index.ts
      pages/
        LoginPage.tsx
        index.ts
      services/
        authService.ts
        index.ts
      store/
        authSlice.ts
        index.ts
      types/
        index.ts
      validations/
        loginSchema.ts
        index.ts
      index.ts
    dashboard/
      components/
        DashboardKpiCard.tsx
        index.ts
      hooks/
        useDashboardSummary.ts
        index.ts
      pages/
        DashboardPage.tsx
        index.ts
      services/
        dashboardService.ts
        index.ts
      store/
        index.ts
      types/
        index.ts
      validations/
        index.ts
      index.ts
    smartvision/
      components/
        AiAlertCard.tsx
        index.ts
      hooks/
        useSmartVisionDetections.ts
        index.ts
      pages/
        SmartVisionPage.tsx
        index.ts
      services/
        smartvisionService.ts
        index.ts
      store/
        index.ts
      types/
        index.ts
      validations/
        index.ts
      index.ts
    vehicles/
      components/
        VehicleStatusBadge.tsx
        index.ts
      hooks/
        useVehicles.ts
        index.ts
      pages/
        VehiclesPage.tsx
        index.ts
      services/
        vehiclesService.ts
        index.ts
      store/
        index.ts
      types/
        index.ts
      validations/
        index.ts
      index.ts
    drivers/
      components/
        DriverCard.tsx
        index.ts
      hooks/
        useDrivers.ts
        index.ts
      pages/
        DriversPage.tsx
        index.ts
      services/
        driversService.ts
        index.ts
      store/
        index.ts
      types/
        index.ts
      validations/
        index.ts
      index.ts
    orders/
      components/
        OrderTimeline.tsx
        index.ts
      hooks/
        useOrders.ts
        index.ts
      pages/
        OrdersPage.tsx
        index.ts
      services/
        ordersService.ts
        index.ts
      store/
        index.ts
      types/
        index.ts
      validations/
        index.ts
      index.ts
    routes/
      components/
        RouteMap.tsx
        index.ts
      hooks/
        useRoutes.ts
        index.ts
      pages/
        RoutesPage.tsx
        index.ts
      services/
        routesService.ts
        index.ts
      store/
        index.ts
      types/
        index.ts
      validations/
        index.ts
      index.ts
    incidents/
      components/
        IncidentSeverityBadge.tsx
        index.ts
      hooks/
        useIncidents.ts
        index.ts
      pages/
        IncidentsPage.tsx
        index.ts
      services/
        incidentsService.ts
        index.ts
      store/
        index.ts
      types/
        index.ts
      validations/
        index.ts
      index.ts
    maintenance/
      components/
        MaintenanceScheduleCard.tsx
        index.ts
      hooks/
        useMaintenanceEvents.ts
        index.ts
      pages/
        MaintenancePage.tsx
        index.ts
      services/
        maintenanceService.ts
        index.ts
      store/
        index.ts
      types/
        index.ts
      validations/
        index.ts
      index.ts
    reports/
      components/
        ReportChart.tsx
        index.ts
      hooks/
        useReports.ts
        index.ts
      pages/
        ReportsPage.tsx
        index.ts
      services/
        reportsService.ts
        index.ts
      store/
        index.ts
      types/
        index.ts
      validations/
        index.ts
      index.ts
    profile/
      components/
        ProfileForm.tsx
        index.ts
      hooks/
        useProfile.ts
        index.ts
      pages/
        ProfilePage.tsx
        index.ts
      services/
        profileService.ts
        index.ts
      store/
        index.ts
      types/
        index.ts
      validations/
        index.ts
      index.ts
    settings/
      components/
        SettingsPanel.tsx
        index.ts
      hooks/
        useSettings.ts
        index.ts
      pages/
        SettingsPage.tsx
        index.ts
      services/
        settingsService.ts
        index.ts
      store/
        index.ts
      types/
        index.ts
      validations/
        index.ts
      index.ts
  hooks/
    index.ts
  lib/
    index.ts
  routes/
    index.tsx
  services/
    apiClient.ts
    index.ts
  store/
    hooks.ts
    index.ts
  styles/
    index.css
  types/
    role.ts
    index.ts
  utils/
    cn.ts
    index.ts
  App.css
  App.tsx
  index.css
  main.tsx
```

## Sidebar

La navegacion principal vive en `src/config/navigation.ts` y se consume desde `src/components/layouts/Sidebar.tsx`.

Orden propuesto:

1. Dashboard
2. SmartVision IA
3. Vehiculos
4. Conductores
5. Ordenes
6. Rutas
7. Incidentes
8. Mantenimiento
9. Reportes

`Configuracion` queda como acceso persistente en la parte inferior del sidebar. `Perfil de usuario` puede exponerse desde el topbar o desde un menu de usuario.

## Comandos PowerShell

```powershell
$features = @(
  'auth','dashboard','smartvision','vehicles','drivers','orders',
  'routes','incidents','maintenance','reports','profile','settings'
)

$globalDirs = @(
  'src\app\providers','src\assets\icons','src\assets\images','src\assets\logos',
  'src\components\common','src\components\forms','src\components\layouts',
  'src\config','src\hooks','src\lib','src\routes','src\services',
  'src\store','src\styles','src\types','src\utils'
)

foreach ($dir in $globalDirs) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

foreach ($feature in $features) {
  foreach ($dir in @('pages','components','services','hooks','store','types','validations')) {
    New-Item -ItemType Directory -Force -Path "src\features\$feature\$dir" | Out-Null
    New-Item -ItemType File -Force -Path "src\features\$feature\$dir\index.ts" | Out-Null
  }
  New-Item -ItemType File -Force -Path "src\features\$feature\index.ts" | Out-Null
}
```

## Comandos Bash

```bash
features=(
  auth dashboard smartvision vehicles drivers orders
  routes incidents maintenance reports profile settings
)

mkdir -p \
  src/app/providers src/assets/icons src/assets/images src/assets/logos \
  src/components/common src/components/forms src/components/layouts \
  src/config src/hooks src/lib src/routes src/services \
  src/store src/styles src/types src/utils

for feature in "${features[@]}"; do
  mkdir -p "src/features/$feature"/{pages,components,services,hooks,store,types,validations}
  touch "src/features/$feature/index.ts"
  touch "src/features/$feature"/{pages,components,services,hooks,store,types,validations}/index.ts
done
```

## Nota TypeScript

Con `verbatimModuleSyntax` habilitado, los simbolos que solo existen en tiempo de tipos deben importarse con `import type`. Por eso `RootState` se importa asi:

```ts
import type { RootState } from '@/store';
```

## Specs activas

- `dimensional-evidence-validation-web`: spec frontend web recorte solo-frontend de validacion dimensional de evidencia (ver `.kiro/specs/dimensional-evidence-validation-web/spec.json`). Fase: `initialized`.
