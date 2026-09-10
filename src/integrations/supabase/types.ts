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
      addresses: {
        Row: {
          county: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          notes: string | null
          phone: string
          recipient_name: string
          street: string | null
          sub_county: string | null
          town: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          county: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          notes?: string | null
          phone: string
          recipient_name: string
          street?: string | null
          sub_county?: string | null
          town?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          county?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          notes?: string | null
          phone?: string
          recipient_name?: string
          street?: string | null
          sub_county?: string | null
          town?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auth_settings: {
        Row: {
          apple_enabled: boolean
          created_at: string
          email_enabled: boolean
          google_client_id: string | null
          google_enabled: boolean
          id: string
          signup_enabled: boolean
          social_note: string | null
          updated_at: string
        }
        Insert: {
          apple_enabled?: boolean
          created_at?: string
          email_enabled?: boolean
          google_client_id?: string | null
          google_enabled?: boolean
          id?: string
          signup_enabled?: boolean
          social_note?: string | null
          updated_at?: string
        }
        Update: {
          apple_enabled?: boolean
          created_at?: string
          email_enabled?: boolean
          google_client_id?: string | null
          google_enabled?: boolean
          id?: string
          signup_enabled?: boolean
          social_note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_total: number
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_total?: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_total?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      couriers: {
        Row: {
          counties: string[]
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          tracking_url_template: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          counties?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          tracking_url_template?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          counties?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          tracking_url_template?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          admin_notify_email: string | null
          at_api_key: string | null
          at_sandbox: boolean
          at_sender_id: string | null
          at_username: string | null
          created_at: string
          custom_password_reset: boolean
          email_enabled: boolean
          email_provider: string
          from_email: string | null
          from_name: string | null
          id: string
          notify_admin_new_order: boolean
          notify_order_confirmation: boolean
          notify_payment_received: boolean
          notify_shipping_update: boolean
          resend_api_key: string | null
          sms_enabled: boolean
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_secure: boolean
          smtp_user: string | null
          updated_at: string
        }
        Insert: {
          admin_notify_email?: string | null
          at_api_key?: string | null
          at_sandbox?: boolean
          at_sender_id?: string | null
          at_username?: string | null
          created_at?: string
          custom_password_reset?: boolean
          email_enabled?: boolean
          email_provider?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          notify_admin_new_order?: boolean
          notify_order_confirmation?: boolean
          notify_payment_received?: boolean
          notify_shipping_update?: boolean
          resend_api_key?: string | null
          sms_enabled?: boolean
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean
          smtp_user?: string | null
          updated_at?: string
        }
        Update: {
          admin_notify_email?: string | null
          at_api_key?: string | null
          at_sandbox?: boolean
          at_sender_id?: string | null
          at_username?: string | null
          created_at?: string
          custom_password_reset?: boolean
          email_enabled?: boolean
          email_provider?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          notify_admin_new_order?: boolean
          notify_order_confirmation?: boolean
          notify_payment_received?: boolean
          notify_shipping_update?: boolean
          resend_api_key?: string | null
          sms_enabled?: boolean
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean
          smtp_user?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mpesa_config: {
        Row: {
          account_reference: string | null
          callback_url: string | null
          consumer_key: string | null
          consumer_secret: string | null
          created_at: string
          environment: string
          id: string
          is_active: boolean
          mode: string
          party_b: string | null
          passkey: string | null
          short_code: string | null
          transaction_desc: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          account_reference?: string | null
          callback_url?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string
          environment?: string
          id?: string
          is_active?: boolean
          mode?: string
          party_b?: string | null
          passkey?: string | null
          short_code?: string | null
          transaction_desc?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          account_reference?: string | null
          callback_url?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string
          environment?: string
          id?: string
          is_active?: boolean
          mode?: string
          party_b?: string | null
          passkey?: string | null
          short_code?: string | null
          transaction_desc?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          order_id: string | null
          recipient: string
          status: string
          subject: string | null
          template: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          order_id?: string | null
          recipient: string
          status?: string
          subject?: string | null
          template?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          order_id?: string | null
          recipient?: string
          status?: string
          subject?: string | null
          template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          county: string | null
          coupon_code: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          delivery_method: string
          discount: number
          id: string
          notes: string | null
          order_number: string
          payment_method: string
          payment_status: string
          status: string
          street: string | null
          sub_county: string | null
          subtotal: number
          total: number
          town: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          county?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          delivery_method?: string
          discount?: number
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string
          payment_status?: string
          status?: string
          street?: string | null
          sub_county?: string | null
          subtotal?: number
          total?: number
          town?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          county?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          delivery_method?: string
          discount?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: string
          status?: string
          street?: string | null
          sub_county?: string | null
          subtotal?: number
          total?: number
          town?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          checkout_request_id: string | null
          created_at: string
          id: string
          merchant_request_id: string | null
          mpesa_receipt: string | null
          order_id: string | null
          phone: string | null
          provider: string
          raw: Json | null
          result_code: string | null
          result_desc: string | null
          status: string
          updated_at: string
          user_id: string | null
          verification_note: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          order_id?: string | null
          phone?: string | null
          provider?: string
          raw?: Json | null
          result_code?: string | null
          result_desc?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          verification_note?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          order_id?: string | null
          phone?: string | null
          provider?: string
          raw?: Json | null
          result_code?: string | null
          result_desc?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          verification_note?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          compare_price: number | null
          created_at: string
          description: string | null
          features: string[]
          id: string
          images: string[]
          is_active: boolean
          is_featured: boolean
          low_stock_threshold: number
          name: string
          price: number
          rating: number
          review_count: number
          short_description: string | null
          sku: string | null
          slug: string
          specs: Json
          stock: number
          tag: string | null
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          compare_price?: number | null
          created_at?: string
          description?: string | null
          features?: string[]
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          low_stock_threshold?: number
          name: string
          price?: number
          rating?: number
          review_count?: number
          short_description?: string | null
          sku?: string | null
          slug: string
          specs?: Json
          stock?: number
          tag?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          compare_price?: number | null
          created_at?: string
          description?: string | null
          features?: string[]
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          low_stock_threshold?: number
          name?: string
          price?: number
          rating?: number
          review_count?: number
          short_description?: string | null
          sku?: string | null
          slug?: string
          specs?: Json
          stock?: number
          tag?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          marketing_opt_in: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          marketing_opt_in?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          marketing_opt_in?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          admin_note: string | null
          budget: string | null
          company: string
          contact_person: string
          created_at: string
          email: string
          id: string
          notes: string | null
          other_items: string | null
          phone: string
          quantity: string | null
          selected_products: Json
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          budget?: string | null
          company: string
          contact_person: string
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          other_items?: string | null
          phone: string
          quantity?: string | null
          selected_products?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          budget?: string | null
          company?: string
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          other_items?: string | null
          phone?: string
          quantity?: string | null
          selected_products?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string | null
          body: string | null
          created_at: string
          id: string
          is_approved: boolean
          product_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          courier: string | null
          courier_contact: string | null
          courier_id: string | null
          created_at: string
          current_location: string | null
          estimated_delivery: string | null
          history: Json
          id: string
          order_id: string
          status: string
          tracking_number: string
          updated_at: string
        }
        Insert: {
          courier?: string | null
          courier_contact?: string | null
          courier_id?: string | null
          created_at?: string
          current_location?: string | null
          estimated_delivery?: string | null
          history?: Json
          id?: string
          order_id: string
          status?: string
          tracking_number: string
          updated_at?: string
        }
        Update: {
          courier?: string | null
          courier_contact?: string | null
          courier_id?: string | null
          created_at?: string
          current_location?: string | null
          estimated_delivery?: string | null
          history?: Json
          id?: string
          order_id?: string
          status?: string
          tracking_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          created_at: string
          express_delivery_fee: number
          facebook_url: string | null
          free_delivery_threshold: number
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          logo_url: string | null
          mpesa_account_name: string | null
          mpesa_paybill: string | null
          standard_delivery_fee: number
          store_name: string
          support_email: string | null
          support_phone: string | null
          tagline: string
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          whatsapp_number: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          express_delivery_fee?: number
          facebook_url?: string | null
          free_delivery_threshold?: number
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          mpesa_account_name?: string | null
          mpesa_paybill?: string | null
          standard_delivery_fee?: number
          store_name?: string
          support_email?: string | null
          support_phone?: string | null
          tagline?: string
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          express_delivery_fee?: number
          facebook_url?: string | null
          free_delivery_threshold?: number
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          mpesa_account_name?: string | null
          mpesa_paybill?: string | null
          standard_delivery_fee?: number
          store_name?: string
          support_email?: string | null
          support_phone?: string | null
          tagline?: string
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Relationships: []
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
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff" | "customer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff", "customer"],
    },
  },
} as const
