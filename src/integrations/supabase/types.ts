export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      drivers: {
        Row: {
          contact_number: string | null
          created_at: string
          created_by: string | null
          id: string
          license_category: string | null
          license_expiry: string | null
          license_number: string
          name: string
          region: string | null
          safety_score: number
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
        }
        Insert: {
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          license_category?: string | null
          license_expiry?: string | null
          license_number: string
          name: string
          region?: string | null
          safety_score?: number
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
        }
        Update: {
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          license_category?: string | null
          license_expiry?: string | null
          license_number?: string
          name?: string
          region?: string | null
          safety_score?: number
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          vehicle_id: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          cost: number
          created_at: string
          created_by: string | null
          id: string
          liters: number
          log_date: string
          vehicle_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          liters?: number
          log_date?: string
          vehicle_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          liters?: number
          log_date?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          closed_at: string | null
          cost: number
          created_at: string
          created_by: string | null
          description: string
          id: string
          service_date: string
          status: Database["public"]["Enums"]["maintenance_status"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          closed_at?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          service_date?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          closed_at?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          service_date?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          actual_distance: number | null
          cargo_weight: number
          created_at: string
          created_by: string | null
          destination: string
          driver_id: string | null
          fuel_consumed: number | null
          id: string
          planned_distance: number
          revenue: number
          source: string
          status: Database["public"]["Enums"]["trip_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          actual_distance?: number | null
          cargo_weight?: number
          created_at?: string
          created_by?: string | null
          destination: string
          driver_id?: string | null
          fuel_consumed?: number | null
          id?: string
          planned_distance?: number
          revenue?: number
          source: string
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_distance?: number | null
          cargo_weight?: number
          created_at?: string
          created_by?: string | null
          destination?: string
          driver_id?: string | null
          fuel_consumed?: number | null
          id?: string
          planned_distance?: number
          revenue?: number
          source?: string
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          acquisition_cost: number
          created_at: string
          created_by: string | null
          id: string
          max_load_capacity: number
          name: string
          odometer: number
          region: string | null
          registration_number: string
          revenue: number
          status: Database["public"]["Enums"]["vehicle_status"]
          type: string
          updated_at: string
        }
        Insert: {
          acquisition_cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          max_load_capacity?: number
          name: string
          odometer?: number
          region?: string | null
          registration_number: string
          revenue?: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          type: string
          updated_at?: string
        }
        Update: {
          acquisition_cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          max_load_capacity?: number
          name?: string
          odometer?: number
          region?: string | null
          registration_number?: string
          revenue?: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "fleet_manager"
        | "driver"
        | "safety_officer"
        | "financial_analyst"
      driver_status: "Available" | "On Trip" | "Off Duty" | "Suspended"
      maintenance_status: "Open" | "Closed"
      trip_status: "Draft" | "Dispatched" | "Completed" | "Cancelled"
      vehicle_status: "Available" | "On Trip" | "In Shop" | "Retired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "fleet_manager",
        "driver",
        "safety_officer",
        "financial_analyst",
      ],
      driver_status: ["Available", "On Trip", "Off Duty", "Suspended"],
      maintenance_status: ["Open", "Closed"],
      trip_status: ["Draft", "Dispatched", "Completed", "Cancelled"],
      vehicle_status: ["Available", "On Trip", "In Shop", "Retired"],
    },
  },
} as const
