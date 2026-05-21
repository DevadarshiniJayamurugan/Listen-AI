import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Check if environment variables are set and configured properly
export const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http") &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== "your-local-publishable-key"
)

// Fully compliant mock server client for offline local dev fallback
class MockServerSupabaseClient {
  auth = {
    getUser: async () => {
      return {
        data: {
          user: {
            id: "guest-user-id",
            email: "guest@example.com",
            user_metadata: {},
            app_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString()
          }
        },
        error: null
      }
    },
    getSession: async () => {
      return {
        data: {
          session: {
            user: {
              id: "guest-user-id",
              email: "guest@example.com"
            }
          }
        },
        error: null
      }
    },
    signOut: async () => {
      return { error: null }
    }
  }

  from(table: string) {
    return {
      select: () => ({
        eq: () => ({
          order: () => ({
            single: async () => ({ data: null, error: null }),
            data: [],
            error: null
          }),
          single: async () => ({ data: null, error: null }),
          data: [],
          error: null
        }),
        order: () => ({
          single: async () => ({ data: null, error: null }),
          data: [],
          error: null
        }),
        single: async () => ({ data: null, error: null }),
        data: [],
        error: null
      }),
      insert: async () => ({ data: null, error: null }),
      update: () => ({
        eq: async () => ({ data: null, error: null })
      }),
      delete: () => ({
        eq: async () => ({ data: null, error: null })
      })
    }
  }
}

export async function createClient() {
  if (!isSupabaseConfigured) {
    return new MockServerSupabaseClient() as any
  }

  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have proxy refreshing
          // user sessions.
        }
      },
    },
  })
}

