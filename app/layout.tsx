import './globals.css'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from './components/AuthProvider'
import { LayoutProvider } from './components/LayoutProvider'
import { ResponsiveLayout } from './components/ResponsiveLayout'

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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <LayoutProvider>
            <ResponsiveLayout>
              {children}
            </ResponsiveLayout>
            <Toaster 
              position="top-right"
              expand={true}
              richColors={true}
              closeButton={true}
              duration={5000}
            />
          </LayoutProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
