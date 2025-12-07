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
      reservations: {
        Row: {
          address_apto: string | null
          address_house: string | null
          address_municipality: string | null
          address_province: string | null
          address_residential: string | null
          address_sector: string | null
          address_street: string | null
          bank_name: string | null
          client_type: string
          company_address_apto: string | null
          company_address_house: string | null
          company_address_municipality: string | null
          company_address_province: string | null
          company_address_residential: string | null
          company_address_sector: string | null
          company_address_street: string | null
          company_name: string | null
          company_type: string | null
          created_at: string
          first_name: string | null
          gender: string | null
          id: string
          identification: string | null
          knows_property: boolean | null
          last_name: string | null
          licit_funds: boolean | null
          marital_status: string | null
          mercantil_registry: string | null
          nationality: string | null
          occupation: string | null
          other_nationality: string | null
          passport: string | null
          payment_method: string | null
          product: string | null
          rep_identification: string | null
          rep_marital_status: string | null
          rep_name: string | null
          rep_nationality: string | null
          rep_occupation: string | null
          rep_passport: string | null
          reservation_amount: number | null
          rnc: string | null
          spouse_identification: string | null
          spouse_name: string | null
          spouse_occupation: string | null
          status: string
          transaction_number: string | null
          unit_code: string | null
          unit_level: string | null
          unit_meters: string | null
          unit_parking: string | null
          us_citizen: boolean | null
          us_permanence: boolean | null
          us_political: boolean | null
          us_residency: boolean | null
        }
        Insert: {
          address_apto?: string | null
          address_house?: string | null
          address_municipality?: string | null
          address_province?: string | null
          address_residential?: string | null
          address_sector?: string | null
          address_street?: string | null
          bank_name?: string | null
          client_type: string
          company_address_apto?: string | null
          company_address_house?: string | null
          company_address_municipality?: string | null
          company_address_province?: string | null
          company_address_residential?: string | null
          company_address_sector?: string | null
          company_address_street?: string | null
          company_name?: string | null
          company_type?: string | null
          created_at?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          identification?: string | null
          knows_property?: boolean | null
          last_name?: string | null
          licit_funds?: boolean | null
          marital_status?: string | null
          mercantil_registry?: string | null
          nationality?: string | null
          occupation?: string | null
          other_nationality?: string | null
          passport?: string | null
          payment_method?: string | null
          product?: string | null
          rep_identification?: string | null
          rep_marital_status?: string | null
          rep_name?: string | null
          rep_nationality?: string | null
          rep_occupation?: string | null
          rep_passport?: string | null
          reservation_amount?: number | null
          rnc?: string | null
          spouse_identification?: string | null
          spouse_name?: string | null
          spouse_occupation?: string | null
          status?: string
          transaction_number?: string | null
          unit_code?: string | null
          unit_level?: string | null
          unit_meters?: string | null
          unit_parking?: string | null
          us_citizen?: boolean | null
          us_permanence?: boolean | null
          us_political?: boolean | null
          us_residency?: boolean | null
        }
        Update: {
          address_apto?: string | null
          address_house?: string | null
          address_municipality?: string | null
          address_province?: string | null
          address_residential?: string | null
          address_sector?: string | null
          address_street?: string | null
          bank_name?: string | null
          client_type?: string
          company_address_apto?: string | null
          company_address_house?: string | null
          company_address_municipality?: string | null
          company_address_province?: string | null
          company_address_residential?: string | null
          company_address_sector?: string | null
          company_address_street?: string | null
          company_name?: string | null
          company_type?: string | null
          created_at?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          identification?: string | null
          knows_property?: boolean | null
          last_name?: string | null
          licit_funds?: boolean | null
          marital_status?: string | null
          mercantil_registry?: string | null
          nationality?: string | null
          occupation?: string | null
          other_nationality?: string | null
          passport?: string | null
          payment_method?: string | null
          product?: string | null
          rep_identification?: string | null
          rep_marital_status?: string | null
          rep_name?: string | null
          rep_nationality?: string | null
          rep_occupation?: string | null
          rep_passport?: string | null
          reservation_amount?: number | null
          rnc?: string | null
          spouse_identification?: string | null
          spouse_name?: string | null
          spouse_occupation?: string | null
          status?: string
          transaction_number?: string | null
          unit_code?: string | null
          unit_level?: string | null
          unit_meters?: string | null
          unit_parking?: string | null
          us_citizen?: boolean | null
          us_permanence?: boolean | null
          us_political?: boolean | null
          us_residency?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
