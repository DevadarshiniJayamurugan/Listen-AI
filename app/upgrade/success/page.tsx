"use client"

import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, Sparkles, ArrowRight, Shield, Clock, MessageSquare, Zap } from "lucide-react"
import { useEffect } from "react"
import confetti from "@/lib/confetti"

export default function UpgradeSuccessPage() {
  const brandColor = "#760716" // Burgundy single source of truth

  useEffect(() => {
    // Trigger full screen confetti on mount to celebrate conversion!
    confetti()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-30%] left-[-10%] w-[80%] h-[80%] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-30%] right-[-10%] w-[80%] h-[80%] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

      <Navigation />
      
      <div className="flex-grow flex items-center justify-center px-4 py-16 z-10">
        <div className="max-w-2xl w-full text-center space-y-8 bg-card/45 backdrop-blur-md border border-primary/20 rounded-3xl p-8 lg:p-12 shadow-2xl relative">
          
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner animate-bounce">
                <CheckCircle className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border border-primary-foreground/10">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-none">
              Welcome to <span className="text-primary">Listen Pro</span>!
            </h1>
            <p className="text-base text-muted-foreground font-light max-w-md mx-auto leading-relaxed">
              Your subscription upgrade was successful. Your account limits have been completely lifted, and premium features are immediately available.
            </p>
          </div>

          {/* Features unlocked checklist */}
          <div className="bg-secondary/15 backdrop-blur-sm border border-border/80 rounded-2xl p-6 text-left space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Your Unlocked Pro Benefits:
            </h3>
            
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-light text-muted-foreground">
              <li className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>Unlimited audio recording duration</span>
              </li>
              <li className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                <span>Unlimited meeting history storage</span>
              </li>
              <li className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                <span>Ask AI context-aware meeting chatbot</span>
              </li>
              <li className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span>Custom speaker profile renaming</span>
              </li>
              <li className="flex items-center gap-3">
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                <span>1-click Notion & Docs integrations</span>
              </li>
              <li className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-primary shrink-0" />
                <span>Priority premium audio processing queue</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button size="lg" className="rounded-xl text-white font-bold px-8 hover:scale-[1.02] transition-transform" style={{ backgroundColor: brandColor }} asChild>
              <Link href="/listen" className="flex items-center gap-2">
                Open Workspace
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl font-bold border-border" asChild>
              <Link href="/profile">Manage Subscription</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

