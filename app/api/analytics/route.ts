import { NextRequest, NextResponse } from 'next/server';
import { JobAnalyticsService, AnalyticsFilters, AnalyticsTimeframe } from '@/lib/services/jobAnalyticsService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filters: AnalyticsFilters = {};
    
    if (searchParams.get('dateFrom')) {
      filters.dateFrom = new Date(searchParams.get('dateFrom')!);
    }
    
    if (searchParams.get('dateTo')) {
      filters.dateTo = new Date(searchParams.get('dateTo')!);
    }
    
    if (searchParams.get('pipelineIds')) {
      filters.pipelineIds = searchParams.get('pipelineIds')!.split(',');
    }
    
    if (searchParams.get('stageIds')) {
      filters.stageIds = searchParams.get('stageIds')!.split(',');
    }
    
    if (searchParams.get('imageIds')) {
      filters.imageIds = searchParams.get('imageIds')!.split(',');
    }
    
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status') as AnalyticsFilters['status'];
    }
    
    // Parse timeframe from query parameters
    const timeframe: AnalyticsTimeframe = {
      start: searchParams.get('timeframeStart') 
        ? new Date(searchParams.get('timeframeStart')!)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      end: searchParams.get('timeframeEnd')
        ? new Date(searchParams.get('timeframeEnd')!)
        : new Date(),
      groupBy: (searchParams.get('groupBy') as AnalyticsTimeframe['groupBy']) || 'day'
    };
    
    const analytics = await JobAnalyticsService.getAnalytics(filters, timeframe);
    
    return NextResponse.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    console.error('Analytics API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters = {}, format = 'json' } = body;
    
    const exportBlob = await JobAnalyticsService.exportAnalytics(filters, format);
    
    // Convert blob to buffer for response
    const arrayBuffer = await exportBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const headers = new Headers();
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'json') {
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', `attachment; filename="analytics-${timestamp}.json"`);
    } else {
      headers.set('Content-Type', 'text/csv');
      headers.set('Content-Disposition', `attachment; filename="analytics-${timestamp}.csv"`);
    }
    
    return new NextResponse(buffer, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Analytics export error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 