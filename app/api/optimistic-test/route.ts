import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory counter for demonstration
let counter = 0;

export async function GET() {
  return NextResponse.json({ count: counter });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update counter
    if (body.increment) {
      counter += 1;
    } else if (body.decrement) {
      counter -= 1;
    } else if (typeof body.count === 'number') {
      counter = body.count;
    }
    
    return NextResponse.json({ 
      count: counter,
      timestamp: new Date().toISOString(),
      action: body.increment ? 'increment' : body.decrement ? 'decrement' : 'set'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    counter = body.count || 0;
    
    return NextResponse.json({ 
      count: counter,
      timestamp: new Date().toISOString(),
      action: 'reset'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
} 