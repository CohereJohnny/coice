import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Create a simple SVG placeholder image
  const svg = `
    <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="48" fill="#f3f4f6"/>
      <rect x="8" y="8" width="48" height="32" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1"/>
      <circle cx="18" cy="18" r="3" fill="#9ca3af"/>
      <path d="M8 32L20 20L28 28L44 12L56 24V40H8V32Z" fill="#9ca3af"/>
      <text x="32" y="44" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#6b7280">Image</text>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
} 