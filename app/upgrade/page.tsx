"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, Sparkles, Zap, Shield, Mic, Clock, ArrowRight, Lock, MessageSquare, RefreshCw } from "lucide-react"
import { useSubscription } from "@/contexts/subscription-context"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

export default function UpgradePage() {
  const { isPro, tier, upgradeToPro, downgradeToFree, isLoading: subLoading } = useSubscription()
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const brandColor = "#760716" // Burgundy single source of truth

  const handleUpgrade = async () => {
    if (!user) {
      router.push("/auth/signup?returnUrl=/upgrade")
      return
    }

    setIsProcessing(true)
    try {
      await upgradeToPro()
      toast.success("Welcome to Pro! You now have access to all premium features.")
      router.push("/upgrade/success")
    } catch (error) {
      toast.error("Failed to upgrade. Please try again.")
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDowngrade = async () => {
    setIsProcessing(true)
    try {
      await downgradeToFree()
      toast.success("You've successfully reverted to the Free plan.")
    } catch (error) {
      toast.error("Failed to downgrade. Please try again.")
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  // --- PRO MEMBER SCREEN ---
  if (isPro && !subLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navigation />
        <div className="flex-grow flex items-center justify-center px-4 py-16">
          <div className="max-w-2xl w-full bg-card/45 backdrop-blur-md border border-primary/20 rounded-3xl p-8 lg:p-12 relative overflow-hidden shadow-2xl">
            {/* Background Glows */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

            <div className="text-center mb-10">
              <div className="mb-6 inline-flex p-4 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-inner">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                You are a <span className="text-primary">Pro</span> Member
              </h1>
              <p className="text-base text-muted-foreground font-light max-w-md mx-auto leading-relaxed">
                Thank you for supporting **Listen AI**! You have completely unlocked all premium note-taking, translation, and custom chatbot capabilities.
              </p>
            </div>

            {/* Plan Card */}
            <div className="border border-border/80 rounded-2xl p-6 bg-secondary/15 backdrop-blur-sm mb-8 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-border/60">
                <div>
                  <div className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Your Subscription</div>
                  <div className="text-xl font-extrabold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Pro Premium Plan
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Status</div>
                  <div className="font-semibold text-emerald-500 flex items-center gap-1.5 text-sm bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Unlocked Superpowers:</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-light text-muted-foreground">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span>Unlimited meetings & storage</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span>Unlimited recording durations</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span>Ask AI meeting chatbot</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span>Custom speaker profile renaming</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span>1-click Notion & Docs syncs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span>Premium priority support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="rounded-xl text-white font-bold px-8 hover:scale-[1.02] transition-transform" style={{ backgroundColor: brandColor }} asChild>
                <Link href="/listen">Enter Workspace</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl font-bold border-border"
                onClick={handleDowngrade}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Reverting Plan...
                  </span>
                ) : (
                  "Downgrade to Free"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- PRICING SCREEN FOR FREE / ANONYMOUS USERS ---
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-30%] left-[-10%] w-[80%] h-[80%] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-35%] right-[-10%] w-[80%] h-[80%] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

      <Navigation />

      <div className="flex-grow flex items-center justify-center px-4 py-16 z-10">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Elevate your meetings
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none">
              Supercharge with <span className="text-primary">Listen Pro</span>
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground font-light max-w-xl mx-auto leading-relaxed">
              Unlock the full power of real-time AI transcription, speaker diarization, SaaS synchronization, and customized meeting chatbots.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid md:grid-cols-2 gap-8 items-stretch mb-12">
            
            {/* Free Plan */}
            <div className="border border-border/80 rounded-3xl p-8 bg-card/40 backdrop-blur-md flex flex-col justify-between hover:border-border transition-all">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Free Starter</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black tracking-tight">$0</span>
                    <span className="text-xs text-muted-foreground font-light">/forever</span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 mt-2 font-light">Great for casual recordings and testing the app.</p>
                </div>

                <div className="border-t border-border/60 pt-6">
                  <ul className="space-y-4 text-xs font-light text-muted-foreground">
                    <li className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                      <span>Max 5 minutes per recording limit</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                      <span>Storage limited to 3 meetings maximum</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted-foreground/50 line-through">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>Ask AI context-aware chatbot</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted-foreground/50 line-through">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>Custom speaker profile renaming</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted-foreground/50 line-through">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>1-click Notion & Google Docs exports</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <Button variant="outline" className="w-full py-6 rounded-xl font-bold border-border" disabled>
                  Current Plan
                </Button>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="relative border-2 border-primary rounded-3xl p-8 bg-card/65 backdrop-blur-md flex flex-col justify-between hover:shadow-2xl hover:shadow-primary/5 transition-all">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg border border-primary-foreground/10">
                Highly Recommended
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 fill-current" />
                    Pro Premium
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black tracking-tight">$9.99</span>
                    <span className="text-xs text-muted-foreground font-light">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 mt-2 font-light">Unlock 100% of capabilities. Perfect for busy professionals and students.</p>
                </div>

                <div className="border-t border-border/60 pt-6">
                  <ul className="space-y-4 text-xs font-light text-foreground/95">
                    <li className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                      <span><strong>Unlimited</strong> recording duration length</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-primary shrink-0" />
                      <span><strong>Unlimited</strong> meeting history storage capacity</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                      <span><strong>Ask AI Chatbot</strong> (context-aware answers on recordings)</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <span><strong>Diarization Profile</strong> (globally rename speakers)</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                      <span><strong>SaaS Workspace Integration</strong> (1-click Notion & Docs Syncs)</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <Button
                  className="w-full py-6 rounded-xl font-bold text-white hover:scale-[1.01] hover:brightness-110 transition-all shadow-lg shadow-primary/25"
                  style={{ backgroundColor: brandColor }}
                  onClick={handleUpgrade}
                  disabled={isProcessing || authLoading || subLoading}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Activating Premium...
                    </span>
                  ) : (
                    "Upgrade to Listen Pro"
                  )}
                </Button>
              </div>
            </div>

          </div>

          {/* Footer note */}
          <div className="text-center text-xs text-muted-foreground/75 space-y-1">
            <p>🔒 Secure Stripe Checkout. Cancel subscription at any time with a single click.</p>
            <p className="text-[10px] text-muted-foreground/60">This is a fully-interactive demonstration. No actual credit card or payment is processed.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

