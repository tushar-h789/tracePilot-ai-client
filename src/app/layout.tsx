import type { Metadata, Viewport } from "next"

import "./globals.css"

export const metadata: Metadata = {
  title: { default: "TracePilot AI", template: "%s · TracePilot AI" },
  description: "AI-assisted application observability and incident investigation.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" }

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
