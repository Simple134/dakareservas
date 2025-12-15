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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      locales: {
        Row: {
          id: number
          level: number
          area_mt2: number
          price_per_mt2: number
          total_value: number
          separation_10: number
          separation_45: number
          status: string
        }
        Insert: {
          id?: number
          level: number
          area_mt2: number
          price_per_mt2: number
          total_value: number
          separation_10: number
          separation_45: number
          status: string
        }
        Update: {
          id?: number
          level?: number
          area_mt2?: number
          price_per_mt2?: number
          total_value?: number
          separation_10?: number
          separation_45?: number
          status?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          currency: string
          price: number
          limit: number
          count: number
        }
        Insert: {
          id?: string
          name: string
          currency?: string
          price?: number
          limit?: number
          count?: number
        }
        Update: {
          id?: string
          name?: string
          currency?: string
          price?: number
          limit?: number
          count?: number
        }
        Relationships: []
      }
      product_allocations: {
        Row: {
          id: string
          created_at: string
          product_id: string
          user_type: string
          amount: number | null
          currency: string | null
          persona_fisica_id: string | null
          persona_juridica_id: string | null
          payment_method: string | null
          receipt_url: string | null
          bank_name: string | null
          status: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          product_id: string
          user_type: string
          amount?: number | null
          currency?: string | null
          persona_fisica_id?: string | null
          persona_juridica_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          bank_name?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          product_id?: string
          user_type?: string
          amount?: number | null
          currency?: string | null
          persona_fisica_id?: string | null
          persona_juridica_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          bank_name?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_allocations_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_allocations_persona_fisica_id_fkey"
            columns: ["persona_fisica_id"]
            referencedRelation: "persona_fisica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_allocations_persona_juridica_id_fkey"
            columns: ["persona_juridica_id"]
            referencedRelation: "persona_juridica"
            referencedColumns: ["id"]
          }
        ]
      }
      persona_fisica: {
        Row: {
          id: string
          created_at: string
          status: string | null
          first_name: string | null
          last_name: string | null
          gender: string | null
          identification: string | null
          passport: string | null
          marital_status: string | null
          occupation: string | null
          email: string | null
          spouse_name: string | null
          spouse_identification: string | null
          spouse_occupation: string | null
          address_street: string | null
          address_house: string | null
          address_apto: string | null
          address_residential: string | null
          address_sector: string | null
          address_municipality: string | null
          address_province: string | null
          nationality: string | null
          other_nationality: string | null
          unit_code: string | null
          unit_level: string | null
          unit_meters: string | null
          unit_parking: string | null
          knows_property: boolean | null
          licit_funds: boolean | null
          us_residency: boolean | null
          us_citizen: boolean | null
          us_permanence: boolean | null
          us_political: boolean | null
          locale_id: number | null
          phone: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          status?: string | null
          first_name?: string | null
          last_name?: string | null
          gender?: string | null
          identification?: string | null
          passport?: string | null
          marital_status?: string | null
          occupation?: string | null
          email?: string | null
          spouse_name?: string | null
          spouse_identification?: string | null
          spouse_occupation?: string | null
          address_street?: string | null
          address_house?: string | null
          address_apto?: string | null
          address_residential?: string | null
          address_sector?: string | null
          address_municipality?: string | null
          address_province?: string | null
          nationality?: string | null
          other_nationality?: string | null
          unit_code?: string | null
          unit_level?: string | null
          unit_meters?: string | null
          unit_parking?: string | null
          knows_property?: boolean | null
          licit_funds?: boolean | null
          us_residency?: boolean | null
          us_citizen?: boolean | null
          us_permanence?: boolean | null
          us_political?: boolean | null
          locale_id?: number | null
          phone?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          status?: string | null
          first_name?: string | null
          last_name?: string | null
          gender?: string | null
          identification?: string | null
          passport?: string | null
          marital_status?: string | null
          occupation?: string | null
          email?: string | null
          spouse_name?: string | null
          spouse_identification?: string | null
          spouse_occupation?: string | null
          address_street?: string | null
          address_house?: string | null
          address_apto?: string | null
          address_residential?: string | null
          address_sector?: string | null
          address_municipality?: string | null
          address_province?: string | null
          nationality?: string | null
          other_nationality?: string | null
          unit_code?: string | null
          unit_level?: string | null
          unit_meters?: string | null
          unit_parking?: string | null
          knows_property?: boolean | null
          licit_funds?: boolean | null
          us_residency?: boolean | null
          us_citizen?: boolean | null
          us_permanence?: boolean | null
          us_political?: boolean | null
          locale_id?: number | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persona_fisica_locale_id_fkey"
            columns: ["locale_id"]
            referencedRelation: "locales"
            referencedColumns: ["id"]
          }
        ]
      }
      persona_juridica: {
        Row: {
          id: string
          created_at: string
          status: string | null
          company_type: string | null
          company_name: string | null
          rnc: string | null
          mercantil_registry: string | null
          email: string | null
          company_address_street: string | null
          company_address_house: string | null
          company_address_apto: string | null
          company_address_residential: string | null
          company_address_sector: string | null
          company_address_municipality: string | null
          company_address_province: string | null
          rep_name: string | null
          rep_identification: string | null
          rep_passport: string | null
          rep_marital_status: string | null
          rep_occupation: string | null
          rep_nationality: string | null
          address_street: string | null
          address_house: string | null
          address_apto: string | null
          address_residential: string | null
          address_sector: string | null
          address_municipality: string | null
          address_province: string | null
          unit_code: string | null
          unit_level: string | null
          unit_meters: string | null
          unit_parking: string | null
          knows_property: boolean | null
          licit_funds: boolean | null
          locale_id: number | null
          phone: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          status?: string | null
          company_type?: string | null
          company_name?: string | null
          rnc?: string | null
          mercantil_registry?: string | null
          email?: string | null
          company_address_street?: string | null
          company_address_house?: string | null
          company_address_apto?: string | null
          company_address_residential?: string | null
          company_address_sector?: string | null
          company_address_municipality?: string | null
          company_address_province?: string | null
          rep_name?: string | null
          rep_identification?: string | null
          rep_passport?: string | null
          rep_marital_status?: string | null
          rep_occupation?: string | null
          rep_nationality?: string | null
          address_street?: string | null
          address_house?: string | null
          address_apto?: string | null
          address_residential?: string | null
          address_sector?: string | null
          address_municipality?: string | null
          address_province?: string | null
          unit_code?: string | null
          unit_level?: string | null
          unit_meters?: string | null
          unit_parking?: string | null
          knows_property?: boolean | null
          licit_funds?: boolean | null
          locale_id?: number | null
          phone?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          status?: string | null
          company_type?: string | null
          company_name?: string | null
          rnc?: string | null
          mercantil_registry?: string | null
          email?: string | null
          company_address_street?: string | null
          company_address_house?: string | null
          company_address_apto?: string | null
          company_address_residential?: string | null
          company_address_sector?: string | null
          company_address_municipality?: string | null
          company_address_province?: string | null
          rep_name?: string | null
          rep_identification?: string | null
          rep_passport?: string | null
          rep_marital_status?: string | null
          rep_occupation?: string | null
          rep_nationality?: string | null
          address_street?: string | null
          address_house?: string | null
          address_apto?: string | null
          address_residential?: string | null
          address_sector?: string | null
          address_municipality?: string | null
          address_province?: string | null
          unit_code?: string | null
          unit_level?: string | null
          unit_meters?: string | null
          unit_parking?: string | null
          knows_property?: boolean | null
          licit_funds?: boolean | null
          locale_id?: number | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persona_juridica_locale_id_fkey"
            columns: ["locale_id"]
            referencedRelation: "locales"
            referencedColumns: ["id"]
          }
        ]
      },
      profiles: {
        Row: {
          id: string
          created_at: string
          email: string | null
          full_name: string | null
          role: string | null
        }
        Insert: {
          id: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          role?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_reservation: {
        Args: {
          payload: Json
        }
        Returns: Json
      },
      allocate_product: {
        Args: {
          p_user_id: string
          p_user_type: string
          p_product_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type SchemaName = Exclude<keyof Database, "__InternalSupabase">

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: SchemaName },
  TableName extends PublicTableNameOrOptions extends { schema: SchemaName }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: SchemaName }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: SchemaName },
  TableName extends PublicTableNameOrOptions extends { schema: SchemaName }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: SchemaName }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: SchemaName },
  TableName extends PublicTableNameOrOptions extends { schema: SchemaName }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: SchemaName }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: SchemaName },
  EnumName extends PublicEnumNameOrOptions extends { schema: SchemaName }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: SchemaName }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: SchemaName },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: SchemaName
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: SchemaName }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
