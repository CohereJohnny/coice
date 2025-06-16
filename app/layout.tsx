import './globals.css'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/app/components/AuthProvider'
import { LayoutProvider } from '@/app/components/LayoutProvider'
import { ResponsiveLayout } from '@/app/components/ResponsiveLayout'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Coice - Cohere Image Catalog Explorer',
  description: 'AI-powered image catalog management and analysis platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-background text-foreground">
        <AuthProvider>
          <LayoutProvider>
            <ResponsiveLayout>
              {children}
            </ResponsiveLayout>
          </LayoutProvider>
        </AuthProvider>
        <Toaster 
          position="top-right"
          expand={true}
          richColors={true}
          closeButton={true}
          duration={5000}
        />
      </body>
    </html>
  )
}
