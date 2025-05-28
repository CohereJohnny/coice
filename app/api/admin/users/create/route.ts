import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user and verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { email, display_name, role, password } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'manager', 'end_user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Create the user using Supabase Auth Admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        display_name: display_name || null
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      if (createError.message.includes('already registered')) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create or update the profile with the specified role
    const { data: profileData, error: profileCreateError } = await supabase
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email: email,
        display_name: display_name || null,
        role: role,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileCreateError) {
      console.error('Error creating profile:', profileCreateError);
      // Try to clean up the auth user if profile creation failed
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
    }

    return NextResponse.json({ 
      user: profileData,
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Error in admin user creation API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 