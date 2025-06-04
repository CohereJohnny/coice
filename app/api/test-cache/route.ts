import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

  // Random chance of error for testing error boundaries
  if (Math.random() < 0.1) {
    return NextResponse.json(
      { error: 'Random test error for error boundary testing' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    data: 'Cached response from /api/test-cache',
    random: Math.random(),
    requestId: Math.random().toString(36).substr(2, 9),
    server: 'Next.js API Route',
    cached: false, // Will be true when served from cache
  });
} 