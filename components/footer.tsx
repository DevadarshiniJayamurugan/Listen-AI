"use client"

import Link from "next/link"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <div className="text-sm text-muted-foreground">
            © {currentYear} 8x Template. All rights reserved.
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
