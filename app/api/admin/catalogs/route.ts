import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all catalogs
    const { data: catalogs, error: catalogsError } = await supabase
      .from('catalogs')
      .select('id, name, created_at')
      .order('name');

    if (catalogsError) {
      return NextResponse.json({ error: 'Failed to fetch catalogs', details: catalogsError.message }, { status: 500 });
    }

    return NextResponse.json(catalogs);
  } catch (error) {
    console.error('Error in catalogs list API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 