"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"
import { supabase } from "@/lib/supabase/client"

export type Tier = "free" | "pro"

export type Subscription = {
  id: string
  user_id: string
  tier: Tier
  created_at: string
  updated_at: string
}

type SubscriptionContextType = {
  subscription: Subscription | null
  isLoading: boolean
  isPro: boolean
  tier: Tier
  upgradeToPro: () => Promise<void>
  downgradeToFree: () => Promise<void>
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  isLoading: true,
  isPro: false,
  tier: "free",
  upgradeToPro: async () => {},
  downgradeToFree: async () => {},
  refresh: async () => {},
})

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setSubscription(null)
        setIsLoading(false)
        return
      }

      // Try to get existing subscription
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned (user doesn't have subscription yet)
        console.error("[SubscriptionContext] Fetch error:", error)
      }

      if (data) {
        setSubscription(data as Subscription)
      } else {
        // Create default free subscription for new users
        const { data: newSub, error: insertError } = await supabase
          .from("subscriptions")
          .insert({ user_id: user.id, tier: "free" })
          .select()
          .single()

        if (insertError) {
          console.error("[SubscriptionContext] Insert error:", insertError)
        } else {
          setSubscription(newSub as Subscription)
        }
      }

      setIsLoading(false)
    } catch (error) {
      console.error("[SubscriptionContext] Fetch error:", error)
      setSubscription(null)
      setIsLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchSubscription()
  }, [fetchSubscription])

  const upgradeToPro = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("subscriptions")
      .update({ tier: "pro" })
      .eq("user_id", user.id)

    if (error) {
      console.error("[SubscriptionContext] Upgrade error:", error)
      throw error
    }

    await refresh()
  }, [refresh])

  const downgradeToFree = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("subscriptions")
      .update({ tier: "free" })
      .eq("user_id", user.id)

    if (error) {
      console.error("[SubscriptionContext] Downgrade error:", error)
      throw error
    }

    await refresh()
  }, [refresh])

  useEffect(() => {
    fetchSubscription()

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (_event: any, session: any) => {
        if (session?.user) {
          await fetchSubscription()
        } else {
          setSubscription(null)
          setIsLoading(false)
        }
      }
    )

    return () => {
      authSubscription.unsubscribe()
    }
  }, [fetchSubscription])

  // Compute derived values
  const isPro = subscription?.tier === "pro"
  const tier = subscription?.tier ?? "free"

  return (
    <SubscriptionContext.Provider value={{ subscription, isLoading, isPro, tier, upgradeToPro, downgradeToFree, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider")
  }
  return context
}
