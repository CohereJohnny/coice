import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current session info
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    return NextResponse.json({
      user: user ? { id: user.id, email: user.email } : null,
      session: session ? { access_token: session.access_token ? 'present' : 'missing' } : null,
      userError: userError?.message || null,
      sessionError: sessionError?.message || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Force sign out
    await supabase.auth.signOut();
    
    // Create response and clear all possible cookies
    const response = NextResponse.json({ message: 'Force logout complete' });
    
    // Clear various cookie patterns
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token',
      'supabase.auth.token',
      'auth-storage'
    ];
    
    cookiesToClear.forEach(cookieName => {
      response.cookies.delete(cookieName);
      response.cookies.set(cookieName, '', { 
        expires: new Date(0),
        path: '/',
        domain: 'localhost'
      });
    });
    
    return response;
  } catch (error) {
    return NextResponse.json({
      error: 'Force logout error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 