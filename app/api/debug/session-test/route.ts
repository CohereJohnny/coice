import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      return NextResponse.json({ 
        error: 'Auth error', 
        details: userError.message,
        success: false 
      });
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'No user found', 
        success: false 
      });
    }

    // Test basic profile access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    // Test user_groups access
    const { data: userGroups, error: userGroupsError } = await supabase
      .from('user_groups')
      .select('group_id')
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        aud: user.aud,
        role: user.role
      },
      profile,
      profileError: profileError?.message,
      userGroups,
      userGroupsError: userGroupsError?.message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Session test error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    });
  }
} 