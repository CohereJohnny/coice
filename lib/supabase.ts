import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Browser client (for use in client components)
export const createSupabaseClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server client (for use in server components)
export const createSupabaseServerClient = async () => {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

// Database types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'manager' | 'end_user'
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'admin' | 'manager' | 'end_user'
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'manager' | 'end_user'
          display_name?: string | null
          created_at?: string
        }
      }
      catalogs: {
        Row: {
          id: number
          name: string
          user_id: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          user_id: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          user_id?: string
          description?: string | null
          created_at?: string
        }
      }
      libraries: {
        Row: {
          id: number
          catalog_id: number
          name: string
          parent_id: number | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          catalog_id: number
          name: string
          parent_id?: number | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          catalog_id?: number
          name?: string
          parent_id?: number | null
          description?: string | null
          created_at?: string
        }
      }
      images: {
        Row: {
          id: string
          library_id: number
          gcs_path: string
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          library_id: number
          gcs_path: string
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          library_id?: number
          gcs_path?: string
          metadata?: Record<string, unknown>
          created_at?: string
        }
      }
      prompts: {
        Row: {
          id: string
          name: string
          prompt: string
          type: 'boolean' | 'descriptive' | 'keywords'
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          prompt: string
          type: 'boolean' | 'descriptive' | 'keywords'
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          prompt?: string
          type?: 'boolean' | 'descriptive' | 'keywords'
          created_by?: string
          created_at?: string
        }
      }
      pipelines: {
        Row: {
          id: string
          library_id: number | null
          name: string
          description: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          library_id?: number | null
          name: string
          description?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          library_id?: number | null
          name?: string
          description?: string | null
          created_by?: string
          created_at?: string
        }
      }
      pipeline_stages: {
        Row: {
          id: string
          pipeline_id: string
          prompt_id: string
          stage_order: number
          filter_condition: Record<string, unknown> | null
        }
        Insert: {
          id?: string
          pipeline_id: string
          prompt_id: string
          stage_order: number
          filter_condition?: Record<string, unknown> | null
        }
        Update: {
          id?: string
          pipeline_id?: string
          prompt_id?: string
          stage_order?: number
          filter_condition?: Record<string, unknown> | null
        }
      }
      jobs: {
        Row: {
          id: string
          pipeline_id: string
          library_id: number
          image_ids: string[]
          status: 'pending' | 'running' | 'completed' | 'failed'
          total_images: number
          processed_images: number
          created_by: string
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          pipeline_id: string
          library_id: number
          image_ids?: string[]
          status?: 'pending' | 'running' | 'completed' | 'failed'
          total_images: number
          processed_images?: number
          created_by: string
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          pipeline_id?: string
          library_id?: number
          image_ids?: string[]
          status?: 'pending' | 'running' | 'completed' | 'failed'
          total_images?: number
          processed_images?: number
          created_by?: string
          created_at?: string
          completed_at?: string | null
        }
      }
      job_results: {
        Row: {
          id: string
          job_id: string
          image_id: string
          stage_id: string
          result: Record<string, unknown>
          executed_at: string
          search_vector: unknown | null
        }
        Insert: {
          id?: string
          job_id: string
          image_id: string
          stage_id: string
          result: Record<string, unknown>
          executed_at?: string
          search_vector?: unknown | null
        }
        Update: {
          id?: string
          job_id?: string
          image_id?: string
          stage_id?: string
          result?: Record<string, unknown>
          executed_at?: string
          search_vector?: unknown | null
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      user_groups: {
        Row: {
          user_id: string
          group_id: string
        }
        Insert: {
          user_id: string
          group_id: string
        }
        Update: {
          user_id?: string
          group_id?: string
        }
      }
      library_groups: {
        Row: {
          library_id: number
          group_id: string
        }
        Insert: {
          library_id: number
          group_id: string
        }
        Update: {
          library_id?: number
          group_id?: string
        }
      }
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
      }
      feature_flags: {
        Row: {
          id: string
          name: string
          enabled: boolean
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          enabled?: boolean
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          enabled?: boolean
          description?: string | null
          created_at?: string
        }
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
  }
} 