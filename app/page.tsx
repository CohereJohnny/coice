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
        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg mb-4 flex items-center justify-center">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">COICE: Smarter Image Analysis for Teams</h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Unlock the power of AI-driven image analysis, collaboration, and insights. COICE helps you manage, analyze, and act on your image data—fast, secure, and accessible from anywhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <button className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">Get Started Free</button>
            </Link>
            <Link href="/auth/login">
              <button className="px-8 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition">Sign In</button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-16 bg-blue-100 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-blue-600 font-semibold">AI</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Image Analysis</h3>
            <p className="text-gray-600">Extract insights, detect patterns, and automate workflows with advanced AI models.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-16 bg-green-100 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-green-600 font-semibold">Team</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-gray-600">Share, comment, and manage image libraries with robust access controls and audit trails.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-16 bg-purple-100 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-purple-600 font-semibold">Fast</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Lightning-Fast Performance</h3>
            <p className="text-gray-600">Optimized for speed and scale—instant search, real-time analytics, and secure cloud storage.</p>
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
      <footer className="py-8 px-4 bg-gray-50 border-t text-center text-gray-500 text-sm">
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
