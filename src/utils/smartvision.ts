import type { DegradedSection } from '@/types';

export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function textField(source: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

export function numberField(source: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

export function degradedSections(value: unknown): DegradedSection[] {
  const sections = record(value).degradedSections;
  return Array.isArray(sections) ? sections.filter((section) => {
    const item = record(section);
    return typeof item.section === 'string' && typeof item.reason === 'string';
  }) : [];
}

export function resourceList(data: unknown, key: string): unknown[] {
  if (Array.isArray(data)) return data;
  const outer = record(data);
  for (const name of [key, 'value', 'data']) {
    if (Array.isArray(outer[name])) return outer[name] as unknown[];
  }
  throw new Error('La respuesta del listado de SmartVision tiene un formato inválido.');
}

export function operationalContext(outer: Record<string, unknown>, source: Record<string, unknown>) {
  const driver = record(outer.driver);
  const route = record(outer.route);
  const vehicle = record(outer.vehicle);
  const order = record(outer.order);
  return {
    driverId: numberField(source, 'driverId') ?? numberField(driver, 'id'),
    driverName: textField(driver, 'fullName', 'email') ?? textField(source, 'driverName'),
    routeId: numberField(source, 'routeId') ?? numberField(route, 'id'),
    routeTitle: textField(route, 'title') ?? textField(source, 'routeTitle'),
    vehicleId: numberField(vehicle, 'id') ?? numberField(route, 'vehicleId') ?? numberField(source, 'vehicleId'),
    vehiclePlate: textField(vehicle, 'plateNumber', 'plate') ?? textField(source, 'vehiclePlate'),
    orderId: numberField(source, 'orderId') ?? numberField(order, 'id'),
    orderLabel: textField(source, 'orderLabel') ?? textField(order, 'addressLine'),
  };
}

export function uniqueDegradedSections(sections: DegradedSection[]): DegradedSection[] {
  return [...new Map(sections.map((section) => [JSON.stringify([section.section, section.reason]), section])).values()];
}
