import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

interface AuditLogRecord {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  profiles?: Array<{
    email: string;
    display_name?: string;
  }>;
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const action = searchParams.get('action') || '';
    const entityType = searchParams.get('entityType') || '';
    const userId = searchParams.get('userId') || '';
    const dateRange = searchParams.get('dateRange') || '';
    const search = searchParams.get('search') || '';
    const isExport = searchParams.get('export') === 'true';

    // Build query
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        changes,
        ip_address,
        user_agent,
        created_at,
        profiles:user_id (
          email,
          display_name
        )
      `);

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (search) {
      query = query.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%`);
    }

    // Apply date range filter
    if (dateRange) {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          break;
        default:
          startDate = new Date(0); // All time
      }

      query = query.gte('created_at', startDate.toISOString());
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    if (isExport) {
      // For export, get all matching records (up to a reasonable limit)
      const { data: logs, error } = await query.limit(10000);
      
      if (error) {
        console.error('Error fetching audit logs for export:', error);
        return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
      }

      // Convert to CSV
      const csvContent = convertToCSV(logs as AuditLogRecord[] || []);
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit-logs.csv"',
        },
      });
    } else {
      // For regular requests, apply pagination
      const offset = (page - 1) * limit;
      
      // Get total count for pagination
      const { count, error: countError } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error counting audit logs:', countError);
      }

      // Get paginated results
      const { data: logs, error } = await query
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('Error fetching audit logs:', error);
        return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
      }

      // Transform data to include user info
      const transformedLogs = (logs as AuditLogRecord[])?.map(log => {
        const userProfile = log.profiles?.[0]; // Take first profile since user_id is unique
        return {
          id: log.id,
          user_id: log.user_id,
          user_email: userProfile?.email,
          user_display_name: userProfile?.display_name,
          action: log.action,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          changes: log.changes,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          created_at: log.created_at,
        };
      }) || [];

      return NextResponse.json({
        logs: transformedLogs,
        total: count || 0,
        page,
        limit,
      });
    }
  } catch (error) {
    console.error('Error in audit logs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function convertToCSV(logs: AuditLogRecord[]): string {
  if (logs.length === 0) return 'No data available';

  const headers = [
    'ID',
    'User Email',
    'User Name',
    'Action',
    'Entity Type',
    'Entity ID',
    'Changes',
    'IP Address',
    'User Agent',
    'Created At'
  ];

  const csvRows = [
    headers.join(','),
    ...logs.map(log => {
      const userProfile = log.profiles?.[0]; // Take first profile
      return [
        log.id,
        userProfile?.email || '',
        userProfile?.display_name || '',
        log.action,
        log.entity_type,
        log.entity_id || '',
        JSON.stringify(log.changes || {}),
        log.ip_address || '',
        log.user_agent || '',
        log.created_at
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    })
  ];

  return csvRows.join('\n');
} 