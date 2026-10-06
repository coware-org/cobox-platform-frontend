import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Eye, Plus, Search, Settings2, Wrench, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { ApiErrorState } from '@/components/shared';
import { Badge, Button, Card, Dialog, Input, Select, Skeleton, useToast } from '@/components/ui';
import {
  useActivateMaintenanceSchedule,
  useCancelMaintenanceOrder,
  useCompleteMaintenanceOrder,
  useCreateMaintenanceOrder,
  useCreateMaintenanceSchedule,
  useDeactivateMaintenanceSchedule,
  useEvaluateMaintenanceSchedule,
  useMaintenanceOrderById,
  useMaintenanceOrders,
  useMaintenanceScheduleById,
  useReceiveParts,
  useRegisterCost,
  useRegisterJob,
  useRequestParts,
  useScheduleMaintenanceOrder,
  useStartMaintenanceOrder,
  useUpdateMaintenanceRules,
} from '../hooks';
import type {
  CancelMaintenanceOrderPayload,
  CompleteMaintenanceOrderPayload,
  CreateMaintenanceOrderPayload,
  CreateMaintenanceSchedulePayload,
  MaintenanceOrder,
  MaintenanceOrderStatus,
  MaintenancePriority,
  MaintenanceReason,
  MaintenanceRule,
  MaintenanceSchedule,
  MaintenanceType,
  ReceivePartsPayload,
  RegisterCostPayload,
  RegisterJobPayload,
  RequestPartsPayload,
  ScheduleMaintenanceOrderPayload,
  UpdateMaintenanceRulesPayload,
} from '../types';

type TabKey = 'orders' | 'schedules';
type OrderDialog =
  | 'create-order'
  | 'schedule'
  | 'complete'
  | 'cancel'
  | 'job'
  | 'parts'
  | 'receive-parts'
  | 'cost'
  | null;
type ScheduleDialogType = 'create-schedule' | 'rules' | null;

const typeLabels: Record<MaintenanceType, string> = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
  PREDICTIVE: 'Predictivo',
};

const priorityLabels: Record<MaintenancePriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Critica',
};

const reasonLabels: Record<MaintenanceReason, string> = {
  SCHEDULED: 'Programado',
  BREAKDOWN: 'Averia',
  INSPECTION: 'Inspeccion',
  OTHER: 'Otro',
};

const statusLabels: Record<MaintenanceOrderStatus, string> = {
  OPEN: 'Abierta',
  SCHEDULED: 'Programada',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const statusClasses: Record<MaintenanceOrderStatus, string> = {
  OPEN: 'bg-slate-100 text-slate-700',
  SCHEDULED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-[#DFF6F1] text-[#0F766E]',
  CANCELLED: 'bg-red-50 text-red-700',
};

const priorityClasses: Record<MaintenancePriority, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-50 text-amber-700',
  HIGH: 'bg-orange-50 text-orange-700',
  CRITICAL: 'bg-red-50 text-red-700',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;
  const data = error.response?.data as { message?: string; details?: string } | undefined;
  return data?.message ?? data?.details ?? fallback;
}

function formatMoney(amount?: string | number | null, currency?: string | null) {
  if (amount == null) return '-';
  return `${amount} ${currency ?? ''}`.trim();
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatKilometers(value?: number | null) {
  return typeof value === 'number' ? `${value.toLocaleString('es-PE')} km` : '-';
}

type RuleDraft = { name: string; thresholdKm: string; thresholdDays: string };

function emptyRule(): RuleDraft {
  return { name: '', thresholdKm: '', thresholdDays: '' };
}

function toRuleDraft(rule: MaintenanceRule): RuleDraft {
  return {
    name: rule.name ?? '',
    thresholdKm: rule.thresholdKm === null || rule.thresholdKm === undefined ? '' : String(rule.thresholdKm),
    thresholdDays: rule.thresholdDays === null || rule.thresholdDays === undefined ? '' : String(rule.thresholdDays),
  };
}

function toMaintenanceRule(draft: RuleDraft): MaintenanceRule {
  return {
    name: draft.name,
    thresholdKm: Number(draft.thresholdKm),
    thresholdDays: Number(draft.thresholdDays),
  };
}

export function MaintenancePage() {
  const [tab, setTab] = useState<TabKey>('orders');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MaintenanceOrderStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | MaintenanceType>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | MaintenancePriority>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<number>();
  const [orderDialog, setOrderDialog] = useState<OrderDialog>(null);
  const [scheduleDialog, setScheduleDialog] = useState<ScheduleDialogType>(null);
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleId, setScheduleId] = useState<number>();
  const [localSchedule, setLocalSchedule] = useState<MaintenanceSchedule | null>(null);

  const { toast } = useToast();
  const ordersQuery = useMaintenanceOrders();
  const orderDetailQuery = useMaintenanceOrderById(selectedOrderId);
  const scheduleQuery = useMaintenanceScheduleById(scheduleId);

  const createOrder = useCreateMaintenanceOrder();
  const scheduleOrder = useScheduleMaintenanceOrder();
  const startOrder = useStartMaintenanceOrder();
  const completeOrder = useCompleteMaintenanceOrder();
  const cancelOrder = useCancelMaintenanceOrder();
  const registerJob = useRegisterJob();
  const requestParts = useRequestParts();
  const receiveParts = useReceiveParts();
  const registerCost = useRegisterCost();
  const createSchedule = useCreateMaintenanceSchedule();
  const activateSchedule = useActivateMaintenanceSchedule();
  const deactivateSchedule = useDeactivateMaintenanceSchedule();
  const evaluateSchedule = useEvaluateMaintenanceSchedule();
  const updateRules = useUpdateMaintenanceRules();

  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const selectedOrder = orderDetailQuery.data ?? orders.find((order) => order.id === selectedOrderId) ?? null;
  const displayedSchedule = scheduleQuery.data ?? localSchedule;

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        String(order.id).includes(term) ||
        String(order.vehicleId).includes(term) ||
        String(order.reason ?? '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesType = typeFilter === 'all' || order.maintenanceType === typeFilter;
      const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });
  }, [orders, priorityFilter, search, statusFilter, typeFilter]);

  const metrics = useMemo(() => ({
    total: orders.length,
    open: orders.filter((order) => order.status === 'OPEN').length,
    scheduled: orders.filter((order) => order.status === 'SCHEDULED').length,
    progress: orders.filter((order) => order.status === 'IN_PROGRESS').length,
    closed: orders.filter((order) => order.status === 'COMPLETED' || order.status === 'CANCELLED').length,
  }), [orders]);

  const handleError = (error: unknown, fallback: string) => toast({ title: getErrorMessage(error, fallback), type: 'error' });

  const updateSelectedOrder = (order: MaintenanceOrder) => {
    setSelectedOrderId(order.id);
  };

  const handleSearchSchedule = () => {
    const parsed = Number(scheduleSearch);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      toast({ title: 'Ingresa un ID de programacion valido', type: 'error' });
      return;
    }
    setScheduleId(parsed);
    setLocalSchedule(null);
  };

  const handleScheduleMutation = (
    mutation: { mutate: (id: number, options: { onSuccess: (schedule: MaintenanceSchedule) => void; onError: (error: unknown) => void }) => void },
    successTitle: string,
  ) => {
    if (!displayedSchedule) return;
    mutation.mutate(displayedSchedule.id, {
      onSuccess: (updated) => {
        setLocalSchedule(updated);
        setScheduleId(updated.id);
        toast({ title: successTitle, type: 'success' });
      },
      onError: (error) => handleError(error, 'No se pudo actualizar la programacion'),
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Gestion de mantenimiento</h1>
          <p className="mt-2 text-sm text-[#64748B]">Controla ordenes, repuestos, costos y programaciones de mantenimiento.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#E2E8F0] bg-white p-1">
          <Button variant={tab === 'orders' ? 'primary' : 'ghost'} onClick={() => setTab('orders')}>
            Ordenes
          </Button>
          <Button variant={tab === 'schedules' ? 'primary' : 'ghost'} onClick={() => setTab('schedules')}>
            Programaciones
          </Button>
        </div>
      </div>

      {tab === 'orders' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard title="Total" value={metrics.total} icon={<ClipboardList className="h-5 w-5" />} tone="slate" />
            <MetricCard title="Abiertas" value={metrics.open} icon={<AlertTriangle className="h-5 w-5" />} tone="blue" />
            <MetricCard title="Programadas" value={metrics.scheduled} icon={<Settings2 className="h-5 w-5" />} tone="blue" />
            <MetricCard title="En progreso" value={metrics.progress} icon={<Wrench className="h-5 w-5" />} tone="amber" />
            <MetricCard title="Cerradas" value={metrics.closed} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
          </div>

          <Card className="grid gap-4 p-5 lg:grid-cols-[1fr_180px_180px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por ID, vehiculo o razon..." className="pl-9" />
            </div>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | MaintenanceOrderStatus)}>
              <option value="all">Todos los estados</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | MaintenanceType)}>
              <option value="all">Todos los tipos</option>
              {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'all' | MaintenancePriority)}>
              <option value="all">Prioridad</option>
              {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Button onClick={() => setOrderDialog('create-order')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Crear
            </Button>
          </Card>

          <Card className="overflow-hidden">
            {ordersQuery.isError ? (
              <div className="p-5"><ApiErrorState onRetry={() => void ordersQuery.refetch()} /></div>
            ) : ordersQuery.isLoading ? (
              <div className="space-y-3 p-5"><Skeleton className="h-10" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-10 text-center text-sm text-[#64748B]">No hay ordenes de mantenimiento para mostrar.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="border-b border-[#E2E8F0] px-6 py-4">Orden</th>
                      <th className="border-b border-[#E2E8F0] px-6 py-4">Vehiculo</th>
                      <th className="border-b border-[#E2E8F0] px-6 py-4">Tipo</th>
                      <th className="border-b border-[#E2E8F0] px-6 py-4">Prioridad</th>
                      <th className="border-b border-[#E2E8F0] px-6 py-4">Estado</th>
                      <th className="border-b border-[#E2E8F0] px-6 py-4">Odometro</th>
                      <th className="border-b border-[#E2E8F0] px-6 py-4">Tecnico</th>
                      <th className="border-b border-[#E2E8F0] px-6 py-4">Costo</th>
                      <th className="border-b border-[#E2E8F0] px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-[#E2E8F0] last:border-b-0">
                        <td className="px-6 py-4 font-semibold text-slate-950">#{order.id}</td>
                        <td className="px-6 py-4">Vehiculo #{order.vehicleId}</td>
                        <td className="px-6 py-4">{typeLabels[order.maintenanceType] ?? order.maintenanceType}</td>
                        <td className="px-6 py-4"><Badge className={priorityClasses[order.priority]}>{priorityLabels[order.priority] ?? order.priority}</Badge></td>
                        <td className="px-6 py-4"><Badge className={statusClasses[order.status]}>{statusLabels[order.status] ?? order.status}</Badge></td>
                        <td className="px-6 py-4">{formatKilometers(order.openingOdometer)}</td>
                        <td className="px-6 py-4">{order.technicianId ? `#${order.technicianId}` : '-'}</td>
                        <td className="px-6 py-4">{formatMoney(order.totalCostAmount, order.totalCostCurrency)}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end">
                            <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Ver detalle" onClick={() => setSelectedOrderId(order.id)}>
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <SchedulesView
          scheduleSearch={scheduleSearch}
          setScheduleSearch={setScheduleSearch}
          schedule={displayedSchedule}
          isLoading={scheduleQuery.isLoading}
          isError={scheduleQuery.isError}
          onSearch={handleSearchSchedule}
          onCreate={() => setScheduleDialog('create-schedule')}
          onActivate={() => handleScheduleMutation(activateSchedule, 'Programacion activada')}
          onDeactivate={() => handleScheduleMutation(deactivateSchedule, 'Programacion desactivada')}
          onEvaluate={() => handleScheduleMutation(evaluateSchedule, 'Programacion evaluada')}
          onEditRules={() => setScheduleDialog('rules')}
          onRetry={() => void scheduleQuery.refetch()}
        />
      )}

      {selectedOrder ? (
        <OrderDetailsDrawer
          order={selectedOrder}
          isLoading={orderDetailQuery.isLoading}
          onClose={() => setSelectedOrderId(undefined)}
          onSchedule={() => setOrderDialog('schedule')}
          onStart={() => startOrder.mutate(selectedOrder.id, {
            onSuccess: (updated) => {
              updateSelectedOrder(updated);
              toast({ title: 'Mantenimiento iniciado', type: 'success' });
            },
            onError: (error) => handleError(error, 'No se pudo iniciar el mantenimiento'),
          })}
          onComplete={() => setOrderDialog('complete')}
          onCancel={() => setOrderDialog('cancel')}
          onJob={() => setOrderDialog('job')}
          onParts={() => setOrderDialog('parts')}
          onReceiveParts={() => setOrderDialog('receive-parts')}
          onCost={() => setOrderDialog('cost')}
        />
      ) : null}

      <MaintenanceOrderDialog
        type={orderDialog}
        order={selectedOrder}
        isSubmitting={
          createOrder.isPending || scheduleOrder.isPending || completeOrder.isPending || cancelOrder.isPending ||
          registerJob.isPending || requestParts.isPending || receiveParts.isPending || registerCost.isPending
        }
        onClose={() => setOrderDialog(null)}
        onCreate={(payload) => createOrder.mutate(payload, {
          onSuccess: (created) => {
            setOrderDialog(null);
            updateSelectedOrder(created);
            toast({ title: 'Orden creada correctamente', type: 'success' });
          },
          onError: (error) => handleError(error, 'No se pudo crear la orden'),
        })}
        onSchedule={(payload) => selectedOrder && scheduleOrder.mutate({ orderId: selectedOrder.id, payload }, {
          onSuccess: (updated) => {
            setOrderDialog(null);
            updateSelectedOrder(updated);
            toast({ title: 'Orden programada', type: 'success' });
          },
          onError: (error) => handleError(error, 'No se pudo programar la orden'),
        })}
        onComplete={(payload) => selectedOrder && completeOrder.mutate({ orderId: selectedOrder.id, payload }, {
          onSuccess: (updated) => {
            setOrderDialog(null);
            updateSelectedOrder(updated);
            toast({ title: 'Orden completada', type: 'success' });
          },
          onError: (error) => handleError(error, 'No se pudo completar la orden'),
        })}
        onCancel={(payload) => selectedOrder && cancelOrder.mutate({ orderId: selectedOrder.id, payload }, {
          onSuccess: (updated) => {
            setOrderDialog(null);
            updateSelectedOrder(updated);
            toast({ title: 'Orden cancelada', type: 'success' });
          },
          onError: (error) => handleError(error, 'No se pudo cancelar la orden'),
        })}
        onJob={(payload) => selectedOrder && registerJob.mutate({ orderId: selectedOrder.id, payload }, {
          onSuccess: (updated) => {
            setOrderDialog(null);
            updateSelectedOrder(updated);
            toast({ title: 'Trabajo registrado', type: 'success' });
          },
          onError: (error) => handleError(error, 'No se pudo registrar el trabajo'),
        })}
        onParts={(payload) => selectedOrder && requestParts.mutate({ orderId: selectedOrder.id, payload }, {
          onSuccess: (updated) => {
            setOrderDialog(null);
            updateSelectedOrder(updated);
            toast({ title: 'Repuesto solicitado', type: 'success' });
          },
          onError: (error) => handleError(error, 'No se pudo solicitar el repuesto'),
        })}
        onReceiveParts={(payload) => selectedOrder && receiveParts.mutate({ orderId: selectedOrder.id, payload }, {
          onSuccess: (updated) => {
            setOrderDialog(null);
            updateSelectedOrder(updated);
            toast({ title: 'Repuesto recibido', type: 'success' });
          },
          onError: (error) => handleError(error, 'No se pudo recibir el repuesto'),
        })}
        onCost={(payload) => selectedOrder && registerCost.mutate({ orderId: selectedOrder.id, payload }, {
          onSuccess: (updated) => {
            setOrderDialog(null);
            updateSelectedOrder(updated);
            toast({ title: 'Costo registrado', type: 'success' });
          },
          onError: (error) => handleError(error, 'No se pudo registrar el costo'),
        })}
      />

      <MaintenanceScheduleDialog
        type={scheduleDialog}
        schedule={displayedSchedule}
        isSubmitting={createSchedule.isPending || updateRules.isPending}
        onClose={() => setScheduleDialog(null)}
        onCreate={(payload) => createSchedule.mutate(payload, {
          onSuccess: (created) => {
            setScheduleDialog(null);
            setLocalSchedule(created);
            setScheduleId(created.id);
            setScheduleSearch(String(created.id));
            toast({ title: 'Programacion creada', type: 'success' });
          },
          onError: (error) => handleError(error, 'No se pudo crear la programacion'),
        })}
        onRules={(payload) => displayedSchedule && updateRules.mutate({ scheduleId: displayedSchedule.id, payload }, {
          onSuccess: (updated) => {
            setScheduleDialog(null);
            setLocalSchedule(updated);
            setScheduleId(updated.id);
            toast({ title: 'Reglas actualizadas', type: 'success' });
          },
          onError: (error) => handleError(error, 'No se pudieron actualizar las reglas'),
        })}
      />
    </section>
  );
}

function MetricCard({ title, value, icon, tone }: { title: string; value: number; icon: ReactNode; tone: 'slate' | 'blue' | 'amber' | 'green' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-[#DFF6F1] text-[#0F766E]',
  };
  return (
    <Card className="flex items-center justify-between p-5">
      <div>
        <p className="text-sm text-[#64748B]">{title}</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
    </Card>
  );
}

function OrderDetailsDrawer({
  order,
  isLoading,
  onClose,
  onSchedule,
  onStart,
  onComplete,
  onCancel,
  onJob,
  onParts,
  onReceiveParts,
  onCost,
}: {
  order: MaintenanceOrder;
  isLoading: boolean;
  onClose: () => void;
  onSchedule: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onJob: () => void;
  onParts: () => void;
  onReceiveParts: () => void;
  onCost: () => void;
}) {
  const requestedParts = order.partsRequests?.filter((part) => part.status === 'REQUESTED') ?? [];
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/30">
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Detalle de orden #{order.id}</h2>
            <p className="mt-1 text-sm text-slate-500">Vehiculo #{order.vehicleId}</p>
          </div>
          <Button variant="ghost" className="h-9 w-9 px-0" aria-label="Cerrar" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {isLoading ? <Skeleton className="mb-4 h-20" /> : null}
          <div className="space-y-4">
            <Card className="grid gap-4 p-4 sm:grid-cols-2">
              <Info label="Tipo" value={typeLabels[order.maintenanceType] ?? order.maintenanceType} />
              <Info label="Prioridad" value={priorityLabels[order.priority] ?? order.priority} />
              <Info label="Estado" value={statusLabels[order.status] ?? order.status} />
              <Info label="Razon" value={reasonLabels[order.reason] ?? order.reason} />
              <Info label="Odometro inicial" value={formatKilometers(order.openingOdometer)} />
              <Info label="Odometro final" value={formatKilometers(order.closingOdometer)} />
              <Info label="Tecnico" value={order.technicianId ? `#${order.technicianId}` : '-'} />
              <Info label="Costo total" value={formatMoney(order.totalCostAmount, order.totalCostCurrency)} />
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Trabajos</h3>
              {(order.jobs ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">Sin trabajos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {(order.jobs ?? []).map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span>{job.description}</span>
                      <Badge className={job.completed ? 'bg-[#DFF6F1] text-[#0F766E]' : 'bg-slate-100 text-slate-700'}>
                        {job.completed ? 'Completado' : 'Pendiente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Repuestos</h3>
              {(order.partsRequests ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">Sin repuestos solicitados.</p>
              ) : (
                <div className="space-y-2">
                  {(order.partsRequests ?? []).map((part) => (
                    <div key={part.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span>{part.partName} x{part.quantity}</span>
                      <Badge className={part.status === 'RECEIVED' ? 'bg-[#DFF6F1] text-[#0F766E]' : 'bg-amber-50 text-amber-700'}>
                        {part.status === 'RECEIVED' ? 'Recibido' : 'Solicitado'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="grid gap-2 border-t border-[#E2E8F0] pt-4">
              {order.status === 'OPEN' ? (
                <>
                  <Button onClick={onSchedule}>Programar</Button>
                  <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                </>
              ) : null}
              {order.status === 'SCHEDULED' ? (
                <>
                  <Button onClick={onStart}>Iniciar mantenimiento</Button>
                  <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                </>
              ) : null}
              {order.status === 'IN_PROGRESS' ? (
                <>
                  <Button onClick={onJob}>Registrar trabajo</Button>
                  <Button variant="secondary" onClick={onParts}>Solicitar repuesto</Button>
                  <Button variant="secondary" onClick={onReceiveParts} disabled={requestedParts.length === 0}>Recibir repuesto</Button>
                  <Button variant="secondary" onClick={onCost}>Registrar costo</Button>
                  <Button onClick={onComplete}>Completar</Button>
                  <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}

function MaintenanceOrderDialog({
  type,
  order,
  isSubmitting,
  onClose,
  onCreate,
  onSchedule,
  onComplete,
  onCancel,
  onJob,
  onParts,
  onReceiveParts,
  onCost,
}: {
  type: OrderDialog;
  order: MaintenanceOrder | null;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (payload: CreateMaintenanceOrderPayload) => void;
  onSchedule: (payload: ScheduleMaintenanceOrderPayload) => void;
  onComplete: (payload: CompleteMaintenanceOrderPayload) => void;
  onCancel: (payload: CancelMaintenanceOrderPayload) => void;
  onJob: (payload: RegisterJobPayload) => void;
  onParts: (payload: RequestPartsPayload) => void;
  onReceiveParts: (payload: ReceivePartsPayload) => void;
  onCost: (payload: RegisterCostPayload) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (type) setForm({});
  }, [type]);

  if (!type) return null;
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = () => {
    if (type === 'create-order') {
      onCreate({
        vehicleId: Number(form.vehicleId),
        maintenanceType: (form.maintenanceType || 'PREVENTIVE') as MaintenanceType,
        priority: (form.priority || 'MEDIUM') as MaintenancePriority,
        reason: (form.reason || 'SCHEDULED') as MaintenanceReason,
        openingOdometer: Number(form.openingOdometer),
        scheduledTimelapseDays: Number(form.scheduledTimelapseDays),
        technicianId: form.technicianId ? Number(form.technicianId) : undefined,
      });
    }
    if (type === 'schedule') onSchedule({ scheduledTimelapseDays: Number(form.scheduledTimelapseDays) });
    if (type === 'complete') onComplete({ closingOdometer: Number(form.closingOdometer) });
    if (type === 'cancel') onCancel({ reason: form.reason ?? '' });
    if (type === 'job') onJob({ description: form.description ?? '', completed: form.completed === 'true' });
    if (type === 'parts') onParts({ partName: form.partName ?? '', quantity: Number(form.quantity) });
    if (type === 'receive-parts') onReceiveParts({ partsRequestId: Number(form.partsRequestId) });
    if (type === 'cost') onCost({ amount: Number(form.amount), currency: form.currency || 'PEN' });
  };

  const titleByType: Record<Exclude<OrderDialog, null>, string> = {
    'create-order': 'Crear orden de mantenimiento',
    schedule: 'Programar orden',
    complete: 'Completar orden',
    cancel: 'Cancelar orden',
    job: 'Registrar trabajo',
    parts: 'Solicitar repuesto',
    'receive-parts': 'Recibir repuesto',
    cost: 'Registrar costo',
  };

  return (
    <Dialog open={Boolean(type)} title={titleByType[type]} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        {type === 'create-order' ? (
          <>
            <Field label="Vehiculo ID" value={form.vehicleId} onChange={(value) => set('vehicleId', value)} type="number" />
            <Field label="Odometro inicial" value={form.openingOdometer} onChange={(value) => set('openingOdometer', value)} type="number" />
            <EnumField label="Tipo" value={form.maintenanceType || 'PREVENTIVE'} options={typeLabels} onChange={(value) => set('maintenanceType', value)} />
            <EnumField label="Prioridad" value={form.priority || 'MEDIUM'} options={priorityLabels} onChange={(value) => set('priority', value)} />
            <EnumField label="Razon" value={form.reason || 'SCHEDULED'} options={reasonLabels} onChange={(value) => set('reason', value)} />
            <Field label="Dias programados" value={form.scheduledTimelapseDays} onChange={(value) => set('scheduledTimelapseDays', value)} type="number" />
            <Field label="Tecnico ID" value={form.technicianId} onChange={(value) => set('technicianId', value)} type="number" />
          </>
        ) : null}
        {type === 'schedule' ? <Field label="Dias programados" value={form.scheduledTimelapseDays} onChange={(value) => set('scheduledTimelapseDays', value)} type="number" /> : null}
        {type === 'complete' ? <Field label="Odometro final" value={form.closingOdometer} onChange={(value) => set('closingOdometer', value)} type="number" /> : null}
        {type === 'cancel' ? <Field label="Motivo" value={form.reason} onChange={(value) => set('reason', value)} /> : null}
        {type === 'job' ? (
          <>
            <Field label="Descripcion" value={form.description} onChange={(value) => set('description', value)} />
            <EnumField label="Completado" value={form.completed || 'false'} options={{ false: 'Pendiente', true: 'Completado' }} onChange={(value) => set('completed', value)} />
          </>
        ) : null}
        {type === 'parts' ? (
          <>
            <Field label="Repuesto" value={form.partName} onChange={(value) => set('partName', value)} />
            <Field label="Cantidad" value={form.quantity} onChange={(value) => set('quantity', value)} type="number" />
          </>
        ) : null}
        {type === 'receive-parts' ? (
          <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Solicitud
            <Select value={form.partsRequestId ?? ''} onChange={(event) => set('partsRequestId', event.target.value)} className="w-full">
              <option value="">Selecciona solicitud</option>
              {(order?.partsRequests ?? []).filter((part) => part.status === 'REQUESTED').map((part) => (
                <option key={part.id} value={part.id}>{part.partName} x{part.quantity}</option>
              ))}
            </Select>
          </label>
        ) : null}
        {type === 'cost' ? (
          <>
            <Field label="Monto" value={form.amount} onChange={(value) => set('amount', value)} type="number" />
            <Field label="Moneda" value={form.currency || 'PEN'} onChange={(value) => set('currency', value)} />
          </>
        ) : null}
      </div>
      <div className="mt-6 flex justify-end gap-3 border-t border-[#E2E8F0] pt-4">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={isSubmitting}>Guardar</Button>
      </div>
    </Dialog>
  );
}

function SchedulesView({
  scheduleSearch,
  setScheduleSearch,
  schedule,
  isLoading,
  isError,
  onSearch,
  onCreate,
  onActivate,
  onDeactivate,
  onEvaluate,
  onEditRules,
  onRetry,
}: {
  scheduleSearch: string;
  setScheduleSearch: (value: string) => void;
  schedule: MaintenanceSchedule | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onSearch: () => void;
  onCreate: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onEvaluate: () => void;
  onEditRules: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        El backend actual no expone listado de programaciones. Usa busqueda por ID o crea una nueva programacion.
      </Card>
      <Card className="flex flex-col gap-3 p-5 md:flex-row md:items-center">
        <Input value={scheduleSearch} onChange={(event) => setScheduleSearch(event.target.value)} placeholder="ID de programacion" type="number" />
        <Button onClick={onSearch}>Consultar</Button>
        <Button variant="secondary" onClick={onCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Crear programacion
        </Button>
      </Card>
      {isError ? <ApiErrorState title="Programacion no encontrada" onRetry={onRetry} /> : null}
      {isLoading ? <Skeleton className="h-40" /> : null}
      {schedule ? (
        <Card className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Programacion #{schedule.id}</h2>
              <p className="mt-1 text-sm text-slate-500">Vehiculo #{schedule.vehicleId}</p>
            </div>
            <Badge className={schedule.status === 'ACTIVE' ? 'bg-[#DFF6F1] text-[#0F766E]' : 'bg-slate-100 text-slate-700'}>
              {schedule.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
            </Badge>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Info label="Ultima evaluacion" value={formatDate(schedule.lastEvaluationAt)} />
            <Info label="Proxima evaluacion" value={formatDate(schedule.nextEvaluationAt)} />
          </div>
          <div className="mt-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-950">Reglas</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {(schedule.rules ?? []).map((rule, index) => (
                <div key={`${rule.name}-${index}`} className="rounded-lg border border-[#E2E8F0] p-3 text-sm">
                  <p className="font-medium text-slate-950">{rule.name}</p>
                  <p className="mt-1 text-slate-500">{formatKilometers(rule.thresholdKm)} · {rule.thresholdDays ?? '-'} dias</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E2E8F0] pt-4">
            {schedule.status === 'ACTIVE' ? <Button variant="secondary" onClick={onDeactivate}>Desactivar</Button> : <Button onClick={onActivate}>Activar</Button>}
            <Button variant="secondary" onClick={onEvaluate}>Evaluar</Button>
            <Button variant="secondary" onClick={onEditRules}>Actualizar reglas</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function MaintenanceScheduleDialog({
  type,
  schedule,
  isSubmitting,
  onClose,
  onCreate,
  onRules,
}: {
  type: ScheduleDialogType;
  schedule: MaintenanceSchedule | null | undefined;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (payload: CreateMaintenanceSchedulePayload) => void;
  onRules: (payload: UpdateMaintenanceRulesPayload) => void;
}) {
  const [vehicleId, setVehicleId] = useState('');
  const [rules, setRules] = useState<RuleDraft[]>(
    schedule?.rules?.length ? schedule.rules.map(toRuleDraft) : [emptyRule()],
  );

  useEffect(() => {
    if (type === 'create-schedule') {
      setVehicleId('');
      setRules([emptyRule()]);
    }
    if (type === 'rules') {
      setRules(schedule?.rules?.length ? schedule.rules.map(toRuleDraft) : [emptyRule()]);
    }
  }, [schedule, type]);

  if (!type) return null;
  const updateRule = (index: number, field: keyof RuleDraft, value: string) => {
    setRules((current) => current.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, [field]: value } : rule)));
  };
  const submit = () => {
    const payload = { rules: rules.filter((rule) => rule.name.trim()).map(toMaintenanceRule) };
    if (type === 'create-schedule') onCreate({ vehicleId: Number(vehicleId), ...payload });
    if (type === 'rules') onRules(payload);
  };
  return (
    <Dialog open={Boolean(type)} title={type === 'create-schedule' ? 'Crear programacion' : 'Actualizar reglas'} onClose={onClose}>
      <div className="space-y-4">
        {type === 'create-schedule' ? <Field label="Vehiculo ID" value={vehicleId} onChange={setVehicleId} type="number" /> : null}
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div key={index} className="grid gap-3 rounded-lg border border-[#E2E8F0] p-3 md:grid-cols-3">
              <Input value={rule.name} onChange={(event) => updateRule(index, 'name', event.target.value)} placeholder="Nombre" />
              <Input value={rule.thresholdKm} onChange={(event) => updateRule(index, 'thresholdKm', event.target.value)} placeholder="Km" type="number" />
              <Input value={rule.thresholdDays} onChange={(event) => updateRule(index, 'thresholdDays', event.target.value)} placeholder="Dias" type="number" />
            </div>
          ))}
        </div>
        <Button variant="secondary" onClick={() => setRules((current) => [...current, emptyRule()])}>Agregar regla</Button>
      </div>
      <div className="mt-6 flex justify-end gap-3 border-t border-[#E2E8F0] pt-4">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={isSubmitting}>Guardar</Button>
      </div>
    </Dialog>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value?: string | number; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <Input value={value ?? ''} type={type} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function EnumField({ label, value, options, onChange }: { label: string; value: string; options: Record<string, string>; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <Select value={value} onChange={(event) => onChange(event.target.value)} className="w-full">
        {Object.entries(options).map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </Select>
    </label>
  );
}
