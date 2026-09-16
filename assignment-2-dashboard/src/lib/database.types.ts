// Hand-written to match supabase/migrations/*.sql, following the same
// shape `supabase gen types` produces so @supabase/supabase-js's generics
// resolve correctly. Once the project is provisioned, regenerate the
// authoritative version with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type VehicleStatus = "available" | "pending" | "sold";
export type ProfileRole = "admin" | "salesperson";

export type Profile = {
  id: string;
  full_name: string;
  role: ProfileRole;
  created_at: string;
};

export type Vehicle = {
  id: string;
  vin: string | null;
  make: string;
  model: string;
  year: number;
  price: number;
  cost: number | null;
  status: VehicleStatus;
  assigned_to: string | null;
  listed_at: string;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Sale = {
  id: string;
  vehicle_id: string;
  salesperson_id: string;
  customer_name: string;
  sale_price: number;
  sale_date: string;
  created_at: string;
};

export type MonthlyRevenue = {
  month: string;
  units_sold: number;
  revenue: number;
  gross_profit: number;
};

export type InventoryAging = {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: VehicleStatus;
  assigned_to: string | null;
  listed_at: string;
  days_on_lot: number;
};

export type SalesByMake = {
  make: string;
  units_sold: number;
  revenue: number;
};

export type DashboardSummary = {
  total_vehicles: number;
  available_vehicles: number;
  total_revenue: number;
  avg_days_on_lot: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; full_name: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      vehicles: {
        Row: Vehicle;
        Insert: Partial<Vehicle> & {
          make: string;
          model: string;
          year: number;
          price: number;
        };
        Update: Partial<Vehicle>;
        Relationships: [];
      };
      sales: {
        Row: Sale;
        Insert: Partial<Sale> & {
          vehicle_id: string;
          salesperson_id: string;
          customer_name: string;
          sale_price: number;
        };
        Update: Partial<Sale>;
        Relationships: [];
      };
    };
    Views: {
      monthly_revenue: { Row: MonthlyRevenue; Relationships: [] };
      inventory_aging: { Row: InventoryAging; Relationships: [] };
      sales_by_make: { Row: SalesByMake; Relationships: [] };
    };
    Functions: {
      dashboard_summary: {
        Args: Record<PropertyKey, never>;
        Returns: DashboardSummary[];
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
