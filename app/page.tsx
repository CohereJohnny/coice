import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
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
          <Image 
            src="/assets/coice.svg" 
            alt="COICE Logo" 
            width={64} 
            height={64} 
            className="mx-auto mb-4" 
            priority 
          />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg">
            COICE: Smarter Image Analysis for Teams
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto drop-shadow">
            Unlock the power of AI-driven image analysis, collaboration, and insights. 
            COICE helps you manage, analyze, and act on your image data—fast, secure, and accessible from anywhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <button className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">
                Get Started Free
              </button>
            </Link>
            <Link href="/auth/login">
              <button className="px-8 py-3 rounded-lg border border-blue-100 text-blue-100 font-semibold bg-white/10 hover:bg-blue-50/20 transition">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <Image 
              src="/assets/landing/ai.jpg" 
              alt="AI Analysis" 
              width={120} 
              height={80} 
              className="rounded-lg mb-4" 
            />
            <h3 className="text-xl font-semibold mb-2">AI-Powered Image Analysis</h3>
            <p className="text-muted-foreground">Extract insights, detect patterns, and automate workflows with advanced AI models.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <Image 
              src="/assets/landing/collaboration.jpg" 
              alt="Collaboration" 
              width={120} 
              height={80} 
              className="rounded-lg mb-4" 
            />
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-muted-foreground">Share, comment, and manage image libraries with robust access controls and audit trails.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <Image 
              src="/assets/landing/performance.jpg" 
              alt="Performance" 
              width={120} 
              height={80} 
              className="rounded-lg mb-4" 
            />
            <h3 className="text-xl font-semibold mb-2">Lightning-Fast Performance</h3>
            <p className="text-muted-foreground">Optimized for speed and scale—instant search, real-time analytics, and secure cloud storage.</p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-12 px-4 bg-blue-50 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to transform your image workflow?</h2>
        <Link href="/auth/register">
          <button className="px-10 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">
            Start Your Free Trial
          </button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-background border-t text-center text-muted-foreground text-sm">
        <div className="mb-2">&copy; {new Date().getFullYear()} COICE. All rights reserved.</div>
        <div className="flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-gray-700">Privacy Policy</Link>
          <span>|</span>
          <Link href="/terms" className="hover:text-gray-700">Terms of Service</Link>
          <span>|</span>
          <a href="mailto:support@coice.ai" className="hover:text-gray-700">Contact</a>
        </div>
      </footer>
    </main>
  );
}
