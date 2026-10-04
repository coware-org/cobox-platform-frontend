import type { LucideIcon } from 'lucide-react';

export type KpiColor = 'green' | 'orange' | 'red' | 'default';

export type CategoryColor = 'red' | 'orange' | 'yellow';

export type Category = {
  id: string;
  name: string;
  count: number;
  color: CategoryColor;
  icon: LucideIcon;
};

export type KpiData = {
  id: string;
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  progress?: number;
  color: KpiColor;
};