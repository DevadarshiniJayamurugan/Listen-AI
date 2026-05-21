"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Menu, X, Sparkles, Mic } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useSubscription } from "@/contexts/subscription-context"
import { useState } from "react"

export function Navigation() {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const { isPro } = useSubscription()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const brandColor = "#760716" // Burgundy single source of truth

  return (
    <>
      {/* Mobile Navigation */}
      <nav className="md:hidden border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: brandColor }}
              >
                <Mic className="w-5 h-5" />
              </div>
              <span className="font-bold tracking-tight text-foreground">Listen AI</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-foreground"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border/50 px-6 py-4 space-y-4 bg-background">
            {!isLoading && (
              <>
                {user ? (
                  <>
                    <Link
                      href="/listen"
                      className="block py-2 text-foreground/80 hover:text-foreground font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Workspace
                    </Link>
                    <Link
                      href="/profile"
                      className="block py-2 text-foreground/80 hover:text-foreground font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    {!isPro ? (
                      <Link
                        href="/upgrade"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block pt-2"
                      >
                        <Button className="w-full text-white" style={{ backgroundColor: brandColor }}>
                          Upgrade to Pro
                        </Button>
                      </Link>
                    ) : (
                      <div className="text-xs text-primary font-semibold py-2">Pro Member Active</div>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href="/#features"
                      className="block py-2 text-foreground/80 hover:text-foreground font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Features
                    </Link>
                    <Link
                      href="/#demo"
                      className="block py-2 text-foreground/80 hover:text-foreground font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Demo
                    </Link>
                    <Link
                      href="/upgrade"
                      className="block py-2 text-foreground/80 hover:text-foreground font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Pricing
                    </Link>
                    <div className="pt-2">
                      <Link
                        href="/auth/login"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button className="w-full text-white" style={{ backgroundColor: brandColor }}>
                          Sign In
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </nav>

      {/* Desktop Navigation */}
      <nav className="hidden md:block border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: brandColor }}
              >
                <Mic className="w-5 h-5" />
              </div>
              <span className="font-bold tracking-tight text-lg text-foreground">Listen AI</span>
            </Link>

            {/* Middle Nav Links */}
            <div className="flex items-center gap-6">
              {!user && (
                <>
                  <Link href="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Features
                  </Link>
                  <Link href="/#demo" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Interactive Demo
                  </Link>
                  <Link href="/upgrade" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </>
              )}
              {user && (
                <Link href="/listen" className={`text-sm font-semibold transition-colors ${pathname === "/listen" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  Workspace
                </Link>
              )}
            </div>

            <div className="flex items-center gap-4">
              {!isLoading && (
                <>
                  {user ? (
                    <div className="flex items-center gap-4">
                      <Link
                        href="/profile"
                        className={`transition-colors ${
                          pathname === "/profile" ? "text-primary" : "text-foreground/80 hover:text-foreground"
                        }`}
                        title="Profile"
                      >
                        <User className="w-5 h-5 text-foreground" />
                      </Link>
                      {!isPro ? (
                        <Link href="/upgrade">
                          <Button variant="outline" size="sm" className="text-sm border-primary/30 hover:border-primary">
                            Upgrade
                          </Button>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                          <Sparkles className="w-3.5 h-3.5" />
                          Pro Active
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Sign In
                      </Link>
                      <Button size="sm" className="text-sm text-white" style={{ backgroundColor: brandColor }} asChild>
                        <Link href="/auth/signup">Get Started Free</Link>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
