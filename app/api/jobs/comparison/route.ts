import { NextRequest, NextResponse } from 'next/server';
import { JobComparisonService, ComparisonFilters } from '@/lib/services/jobComparisonService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, filters, abTestConfig, testId, format } = body;

    switch (action) {
      case 'getComparison':
        {
          const comparisonFilters: ComparisonFilters = {
            jobIds: filters.jobIds || [],
            dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
            dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
            pipelineIds: filters.pipelineIds,
            includeFailedJobs: filters.includeFailedJobs ?? true
          };

          const comparisonData = await JobComparisonService.getComparisonData(comparisonFilters);
          
          return NextResponse.json({
            success: true,
            data: comparisonData
          });
        }

      case 'startABTest':
        {
          if (!abTestConfig) {
            return NextResponse.json(
              { success: false, error: 'A/B test configuration is required' },
              { status: 400 }
            );
          }

          const testId = await JobComparisonService.startABTest(abTestConfig);
          
          return NextResponse.json({
            success: true,
            data: { testId }
          });
        }

      case 'getABTestResults':
        {
          if (!testId) {
            return NextResponse.json(
              { success: false, error: 'Test ID is required' },
              { status: 400 }
            );
          }

          const results = await JobComparisonService.getABTestResults(testId);
          
          return NextResponse.json({
            success: true,
            data: results
          });
        }

      case 'exportComparison':
        {
          const comparisonFilters: ComparisonFilters = {
            jobIds: filters.jobIds || [],
            dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
            dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
            pipelineIds: filters.pipelineIds,
            includeFailedJobs: filters.includeFailedJobs ?? true
          };

          const exportBlob = await JobComparisonService.exportComparison(comparisonFilters, format || 'json');
          
          // Convert blob to buffer for response
          const arrayBuffer = await exportBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          const headers = new Headers();
          const timestamp = new Date().toISOString().split('T')[0];
          
          if (format === 'csv') {
            headers.set('Content-Type', 'text/csv');
            headers.set('Content-Disposition', `attachment; filename="job-comparison-${timestamp}.csv"`);
          } else {
            headers.set('Content-Type', 'application/json');
            headers.set('Content-Disposition', `attachment; filename="job-comparison-${timestamp}.json"`);
          }
          
          return new NextResponse(buffer, {
            status: 200,
            headers
          });
        }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Job comparison API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process job comparison request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 