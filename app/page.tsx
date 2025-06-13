'use client'

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/stores/auth';

// Hero component for non-authenticated users
function HeroPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Hero Section */}
      <section
        className="relative flex flex-col items-center justify-center flex-1 py-24 px-4 text-center bg-gradient-to-b from-blue-50 to-white overflow-hidden"
        style={{ minHeight: '60vh' }}
      >
        {/* Background image with overlay */}
        <div className="absolute inset-0 w-full h-full z-0">
          <Image
            src="/assets/landing/hero-bg.avif"
            alt="COICE Hero Background"
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            className="opacity-60"
            priority
          />
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/60 via-blue-800/40 to-white/80" />
            </div>
        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center">
          <Image src="/assets/coice.svg" alt="COICE Logo" width={64} height={64} className="mx-auto mb-4" priority />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg">COICE: Smarter Image Analysis for Teams</h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto drop-shadow">
            Unlock the power of AI-driven image analysis, collaboration, and insights. COICE helps you manage, analyze, and act on your image data—fast, secure, and accessible from anywhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <button className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">Get Started Free</button>
            </Link>
            <Link href="/auth/login">
              <button className="px-8 py-3 rounded-lg border border-blue-100 text-blue-100 font-semibold bg-white/10 hover:bg-blue-50/20 transition">Sign In</button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <Image src="/assets/landing/ai.jpg" alt="AI Analysis" width={120} height={80} className="rounded-lg mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI-Powered Image Analysis</h3>
            <p className="text-muted-foreground">Extract insights, detect patterns, and automate workflows with advanced AI models.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <Image src="/assets/landing/collaboration.jpg" alt="Collaboration" width={120} height={80} className="rounded-lg mb-4" />
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-muted-foreground">Share, comment, and manage image libraries with robust access controls and audit trails.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <Image src="/assets/landing/performance.jpg" alt="Performance" width={120} height={80} className="rounded-lg mb-4" />
            <h3 className="text-xl font-semibold mb-2">Lightning-Fast Performance</h3>
            <p className="text-muted-foreground">Optimized for speed and scale—instant search, real-time analytics, and secure cloud storage.</p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-12 px-4 bg-blue-50 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to transform your image workflow?</h2>
        <Link href="/auth/register">
          <button className="px-10 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">Start Your Free Trial</button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-background border-t text-center text-muted-foreground text-sm">
        <div className="mb-2">&copy; {new Date().getFullYear()} COICE. All rights reserved.</div>
        <div className="flex justify-center gap-4">
          <Link href="/privacy">Privacy Policy</Link>
          <span>|</span>
          <Link href="/terms">Terms of Service</Link>
          <span>|</span>
          <a href="mailto:support@coice.ai">Contact</a>
      </div>
      </footer>
    </main>
  );
}

// Self-contained Dashboard component for authenticated users
function Dashboard() {
  const { user, profile } = useAuth();

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your image analysis workflows.
          </p>
        </div>

        {/* Dashboard Stats - Self-contained */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Libraries Card */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Libraries</h3>
              <div className="h-4 w-4 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Total image libraries</p>
          </div>

          {/* Active Jobs Card */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Active Jobs</h3>
              <div className="h-4 w-4 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Currently processing</p>
          </div>

          {/* Total Images Card */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Images</h3>
              <div className="h-4 w-4 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Images in all libraries</p>
          </div>

          {/* Recent Jobs Card */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Recent Jobs</h3>
              <div className="h-4 w-4 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Jobs this week</p>
          </div>
        </div>

        {/* Quick Actions - Self-contained */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
            <div className="text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/libraries" className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
              <div className="mb-2 text-current">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-8 w-8"
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
              <span className="text-sm font-medium text-center">Create Library</span>
            </Link>

            <Link href="/libraries" className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
              <div className="mb-2 text-current">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-8 w-8"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
              </div>
              <span className="text-sm font-medium text-center">Upload Images</span>
            </Link>

            <Link href="/analysis" className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
              <div className="mb-2 text-current">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-8 w-8"
                >
                  <path d="M9 12l2 2 4-4" />
                  <path d="M21 12c.552 0 1-.448 1-1V8a2 2 0 0 0-2-2h-5L9.5 3h-3A2 2 0 0 0 4 5v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3c0-.552-.448-1-1-1z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-center">Run Analysis</span>
            </Link>

            <Link href="/search" className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
              <div className="mb-2 text-current">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-8 w-8"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <span className="text-sm font-medium text-center">Search Images</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity - Self-contained */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <div className="text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>

          <div className="text-center py-8">
            <div className="text-muted-foreground mb-2">
              <svg className="h-8 w-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">
              Activity will appear here as you use the system
            </p>
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Getting Started</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">1. Create Your First Library</h4>
              <p className="text-sm text-muted-foreground">
                Organize your images into libraries for better management and analysis.
              </p>
              <Link href="/libraries" className="text-sm text-primary hover:underline">
                Create Library →
              </Link>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">2. Upload Images</h4>
              <p className="text-sm text-muted-foreground">
                Add images to your libraries to start analyzing them with AI.
              </p>
              <Link href="/libraries" className="text-sm text-primary hover:underline">
                Upload Images →
              </Link>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">3. Run Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Use AI-powered pipelines to extract insights from your images.
              </p>
              <Link href="/analysis" className="text-sm text-primary hover:underline">
                Start Analysis →
              </Link>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">4. Search & Explore</h4>
              <p className="text-sm text-muted-foreground">
                Find images quickly using our advanced search capabilities.
              </p>
              <Link href="/search" className="text-sm text-primary hover:underline">
                Search Images →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Loading component
function LoadingPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </main>
  );
}

// Main page component with conditional rendering
export default function HomePage() {
  const { isAuthenticated, loading, initialized } = useAuth();

  // Show loading state while authentication is being determined
  if (loading || !initialized) {
    return <LoadingPage />;
  }

  // Show dashboard for authenticated users, hero page for others
  return isAuthenticated ? <Dashboard /> : <HeroPage />;
}
