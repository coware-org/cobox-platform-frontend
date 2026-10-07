import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { ApiErrorState, TablePagination } from '@/components/shared';
import { Button, Card, Input, Skeleton, useToast } from '@/components/ui';
import { usePagination } from '@/hooks';
import { DriverCard, DriverDetailsPanel } from '../components';
import { useCreateDriver, useDrivers } from '../hooks';
import type { CreateDriverPayload } from '../types';
import { validateCreateDriver } from '../validations';

export function DriversPage() {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CreateDriverPayload>({ email: '', licenceNumber: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>();

  const driversQuery = useDrivers();
  const createDriver = useCreateDriver();
  const { toast } = useToast();

  const drivers = useMemo(() => driversQuery.data ?? [], [driversQuery.data]);
  const filteredDrivers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return drivers;

    return drivers.filter(
      (driver) =>
        driver.id.toLowerCase().includes(normalizedSearch) ||
        driver.email.toLowerCase().includes(normalizedSearch) ||
        driver.licenceNumber.toLowerCase().includes(normalizedSearch),
    );
  }, [drivers, search]);

  const pagination = usePagination({
    items: filteredDrivers,
    initialPageSize: 12,
    pageSizeOptions: [12, 24, 48],
  });

  const handleCreate = () => {
    const payload = { email: form.email.trim(), licenceNumber: form.licenceNumber.trim() };
    const validationError = validateCreateDriver(payload);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    createDriver.mutate(payload, {
      onSuccess: () => {
        setForm({ email: '', licenceNumber: '' });
        setFormError(null);
        toast({ title: 'Conductor agregado correctamente', type: 'success' });
      },
      onError: () => {
        toast({ title: 'No se pudo agregar el conductor', type: 'error' });
      },
    });
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Gestion de conductores</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Consulta conductores, registra licencias y revisa sus rutas asignadas.
        </p>
      </div>

      <Card className="grid gap-4 p-5 xl:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por ID, email o licencia..."
            className="pl-9"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] xl:w-[640px]">
          <Input
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email"
            type="email"
          />
          <Input
            value={form.licenceNumber}
            onChange={(event) => setForm((current) => ({ ...current, licenceNumber: event.target.value }))}
            placeholder="Licencia"
            maxLength={10}
          />
          <Button onClick={handleCreate} disabled={createDriver.isPending}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar
          </Button>
        </div>

        {formError ? <p className="text-sm font-medium text-[#EF4444] xl:col-span-2">{formError}</p> : null}
      </Card>

      <div>
        <div className="grid gap-4 lg:grid-cols-3">
          {driversQuery.isError ? (
            <div className="lg:col-span-3">
              <ApiErrorState onRetry={() => void driversQuery.refetch()} />
            </div>
          ) : driversQuery.isLoading ? (
            Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-52" />)
          ) : (
            pagination.pageItems.map((driver) => (
              <DriverCard key={driver.id} driver={driver} onSelect={setSelectedDriverId} />
            ))
          )}
        </div>
        <TablePagination
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          pageCount={pagination.pageCount}
          totalItems={pagination.totalItems}
          pageSizeOptions={pagination.pageSizeOptions}
          onPageChange={pagination.setPageIndex}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>

      {!driversQuery.isLoading && !driversQuery.isError && filteredDrivers.length === 0 ? (
        <Card className="p-10 text-center text-sm text-[#64748B]">No hay conductores para mostrar.</Card>
      ) : null}

      {selectedDriverId !== undefined ? (
        <DriverDetailsPanel driverId={selectedDriverId} onClose={() => setSelectedDriverId(undefined)} />
      ) : null}
    </section>
  );
}
