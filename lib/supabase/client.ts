import { createBrowserClient } from "@supabase/ssr"

// Check if environment variables are set and are not default placeholders
export const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http") &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== "your-local-publishable-key"
)

// Define dummy fallback keys for build safety
const supabaseUrl = isSupabaseConfigured ? process.env.NEXT_PUBLIC_SUPABASE_URL! : "https://placeholder-url.supabase.co"
const supabaseAnonKey = isSupabaseConfigured ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! : "sb_publishable_placeholder"

const realSupabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Identical Mock Client that persists to localStorage
class MockSupabaseClient {
  private listeners: Array<(_event: string, session: any) => void> = []

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === "listen_mock_session") {
          this.triggerListeners()
        }
      })
    }
  }

  private triggerListeners() {
    const session = this.getMockSession()
    this.listeners.forEach(cb => cb("SIGNED_IN", session))
  }

  private getMockSession() {
    if (typeof window === "undefined") return null
    const sessionStr = localStorage.getItem("listen_mock_session")
    return sessionStr ? JSON.parse(sessionStr) : null
  }

  private setMockSession(session: any) {
    if (typeof window === "undefined") return
    if (session) {
      localStorage.setItem("listen_mock_session", JSON.stringify(session))
    } else {
      localStorage.removeItem("listen_mock_session")
    }
    this.triggerListeners()
  }

  private getMockUsers() {
    if (typeof window === "undefined") return []
    const usersStr = localStorage.getItem("listen_mock_users")
    return usersStr ? JSON.parse(usersStr) : []
  }

  private saveMockUsers(users: any[]) {
    if (typeof window === "undefined") return
    localStorage.setItem("listen_mock_users", JSON.stringify(users))
  }

  auth = {
    getSession: async () => {
      const session = this.getMockSession()
      return { data: { session }, error: null }
    },

    getUser: async () => {
      const session = this.getMockSession()
      return { data: { user: session?.user || null }, error: null }
    },

    signUp: async ({ email, password }: any) => {
      const users = this.getMockUsers()
      if (users.find((u: any) => u.email === email)) {
        return { data: { user: null }, error: { message: "User already exists" } }
      }

      const user = {
        id: crypto.randomUUID ? crypto.randomUUID() : "user_" + Math.random().toString(36).substr(2, 9),
        email,
        created_at: new Date().toISOString(),
      }

      users.push({ email, password, user })
      this.saveMockUsers(users)

      const session = {
        access_token: "mock_token_" + Math.random().toString(36).substr(2),
        user,
      }
      this.setMockSession(session)
      return { data: { user, session }, error: null }
    },

    signInWithPassword: async ({ email, password }: any) => {
      const users = this.getMockUsers()
      const found = users.find((u: any) => u.email === email && u.password === password)
      if (!found) {
        return { data: { user: null, session: null }, error: { message: "Invalid email or password" } }
      }

      const session = {
        access_token: "mock_token_" + Math.random().toString(36).substr(2),
        user: found.user,
      }
      this.setMockSession(session)
      return { data: { user: found.user, session }, error: null }
    },

    signOut: async () => {
      this.setMockSession(null)
      return { error: null }
    },

    onAuthStateChange: (callback: any) => {
      this.listeners.push(callback)
      const session = this.getMockSession()
      // Run callback immediately
      setTimeout(() => callback("SIGNED_IN", session), 0)

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.listeners = this.listeners.filter(cb => cb !== callback)
            }
          }
        }
      }
    }
  }

  from(table: string) {
    const getLocalItems = () => {
      if (typeof window === "undefined") return []
      const itemsStr = localStorage.getItem(`listen_mock_table_${table}`)
      return itemsStr ? JSON.parse(itemsStr) : []
    }

    const saveLocalItems = (items: any[]) => {
      if (typeof window === "undefined") return
      localStorage.setItem(`listen_mock_table_${table}`, JSON.stringify(items))
    }

    const builder = {
      data: getLocalItems(),
      filters: [] as Array<(item: any) => boolean>,
      
      select: (fields?: string) => {
        return builder
      },
      
      eq: (col: string, val: any) => {
        builder.filters.push((item: any) => item[col] === val)
        return builder
      },

      order: (col: string, { ascending }: any = { ascending: false }) => {
        return builder
      },

      single: async () => {
        let filtered = builder.data
        for (const filter of builder.filters) {
          filtered = filtered.filter(filter)
        }
        
        if (filtered.length === 0 && table === "subscriptions") {
          return { data: null, error: { code: "PGRST116", message: "No row found" } }
        }

        return { data: filtered[0] || null, error: null }
      },

      update: (fieldsToUpdate: any) => {
        return {
          eq: (col: string, val: any) => {
            const allItems = getLocalItems()
            let updatedCount = 0
            const updatedItems = allItems.map((item: any) => {
              if (item[col] === val) {
                updatedCount++
                return { ...item, ...fieldsToUpdate, updated_at: new Date().toISOString() }
              }
              return item
            })
            saveLocalItems(updatedItems)
            
            const updated = updatedItems.filter((item: any) => item[col] === val)
            return {
              select: () => ({
                single: async () => ({ data: updated[0] || null, error: null })
              }),
              single: async () => ({ data: updated[0] || null, error: null }),
              data: updated,
              error: null
            }
          }
        }
      },

      insert: (fieldsToInsert: any) => {
        const itemArray = Array.isArray(fieldsToInsert) ? fieldsToInsert : [fieldsToInsert]
        const allItems = getLocalItems()
        
        const inserted = itemArray.map((fields: any) => {
          const id = fields.id || (crypto.randomUUID ? crypto.randomUUID() : "id_" + Math.random().toString(36).substr(2, 9))
          return {
            id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...fields,
          }
        })

        saveLocalItems([...allItems, ...inserted])

        return {
          select: () => ({
            single: async () => ({ data: inserted[0], error: null }),
            data: inserted,
            error: null
          }),
          single: async () => ({ data: inserted[0], error: null }),
          data: inserted,
          error: null
        }
      },

      delete: () => {
        return {
          eq: (col: string, val: any) => {
            const allItems = getLocalItems()
            const filteredItems = allItems.filter((item: any) => item[col] !== val)
            saveLocalItems(filteredItems)
            return { data: null, error: null }
          }
        }
      }
    }

    return builder
  }
}

export const supabase = isSupabaseConfigured ? realSupabase : (new MockSupabaseClient() as any)
