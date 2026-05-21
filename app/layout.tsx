import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { SubscriptionProvider } from "@/contexts/subscription-context"
import { AuthProvider } from "@/contexts/auth-context"
import { Footer } from "@/components/footer"
import { Toaster } from "sonner"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "8x Hiring Template",
  description: "A SaaS starter template for frontend engineering assessments.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png" },
      { url: "/favicon-16x16.png", sizes: "16x16" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased flex flex-col min-h-screen`}>
        <AuthProvider>
          <SubscriptionProvider>
            <div className="flex-1 flex flex-col">
              {children}
            </div>
            <Footer />
          </SubscriptionProvider>
        </AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
