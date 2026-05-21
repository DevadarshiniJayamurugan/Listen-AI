import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileClient } from "./profile-client"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <ProfileClient user={{ ...user, email: user.email ?? "" }} />
}
