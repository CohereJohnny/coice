import { createBrowserClient, createServerClient } from '@supabase/ssr'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton browser client to prevent multiple instances
let browserClient: ReturnType<typeof createBrowserClient> | null = null

// Browser client (for use in client components)
export const createSupabaseClient = () => {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return browserClient
}

// Server client (for use in server components)
export const createSupabaseServerClient = async () => {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: unknown) {
        try {
          cookieStore.set({ name, value, ...options as Record<string, unknown> });
        } catch (error) {
          // In some contexts (like API routes), cookies can't be set
          // This is expected behavior and we can safely ignore it
        }
      },
      remove(name: string, options: unknown) {
        try {
          cookieStore.set({ name, value: '', ...options as Record<string, unknown> });
        } catch (error) {
          // In some contexts (like API routes), cookies can't be set
          // This is expected behavior and we can safely ignore it
        }
      },
    },
  })
}

// Legacy export for backward compatibility
export const supabase = createSupabaseClient()

// Service role client (for server-side operations that bypass RLS)
export const createSupabaseServiceClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  return createBrowserClient(supabaseUrl, serviceRoleKey);
}

// Database types - Generated from Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      catalog_groups: {
        Row: {
          catalog_id: number
          group_id: string
        }
        Insert: {
          catalog_id: number
          group_id: string
        }
        Update: {
          catalog_id?: number
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_groups_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogs: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          created_at: string
          gcs_path: string
          id: string
          library_id: number
          metadata: Json
        }
        Insert: {
          created_at?: string
          gcs_path: string
          id?: string
          library_id: number
          metadata?: Json
        }
        Update: {
          created_at?: string
          gcs_path?: string
          id?: string
          library_id?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "images_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      job_results: {
        Row: {
          executed_at: string
          id: string
          image_id: string
          job_id: string
          result: Json
          search_vector: unknown | null
          stage_id: string
        }
        Insert: {
          executed_at?: string
          id?: string
          image_id: string
          job_id: string
          result: Json
          search_vector?: unknown | null
          stage_id: string
        }
        Update: {
          executed_at?: string
          id?: string
          image_id?: string
          job_id?: string
          result?: Json
          search_vector?: unknown | null
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_results_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_results_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          image_ids: string[]
          library_id: number
          pipeline_id: string
          processed_images: number
          status: string
          total_images: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          image_ids?: string[]
          library_id: number
          pipeline_id: string
          processed_images?: number
          status?: string
          total_images: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          image_ids?: string[]
          library_id?: number
          pipeline_id?: string
          processed_images?: number
          status?: string
          total_images?: number
        }
        Relationships: [
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      libraries: {
        Row: {
          catalog_id: number
          created_at: string
          description: string | null
          id: number
          name: string
          parent_id: number | null
        }
        Insert: {
          catalog_id: number
          created_at?: string
          description?: string | null
          id?: number
          name: string
          parent_id?: number | null
        }
        Update: {
          catalog_id?: number
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          parent_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "libraries_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libraries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      library_groups: {
        Row: {
          group_id: string
          library_id: number
        }
        Insert: {
          group_id: string
          library_id: number
        }
        Update: {
          group_id?: string
          library_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "library_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_groups_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          filter_condition: Json | null
          id: string
          pipeline_id: string
          prompt_id: string
          stage_order: number
        }
        Insert: {
          filter_condition?: Json | null
          id?: string
          pipeline_id: string
          prompt_id: string
          stage_order: number
        }
        Update: {
          filter_condition?: Json | null
          id?: string
          pipeline_id?: string
          prompt_id?: string
          stage_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          library_id: number | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          library_id?: number | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          library_id?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipelines_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          prompt: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          prompt: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          prompt?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          group_id: string
          user_id: string
        }
        Insert: {
          group_id: string
          user_id: string
        }
        Update: {
          group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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