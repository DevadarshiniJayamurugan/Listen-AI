import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ListenClient } from "./listen-client"

export const dynamic = "force-dynamic"

export default async function ListenPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?returnUrl=/listen")
  }

  return <ListenClient user={user} />
}
