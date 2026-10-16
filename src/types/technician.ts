export interface Technician {
  id: string;
  name: string;
  full_name?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  operational_scope?: 'fleet' | 'plant' | 'both';
  status?: string;
  active_orders_count?: number;
  cost_per_hour?: number;
  costPerHour?: number;
}
