import { NextRequest, NextResponse } from 'next/server';
import { ResultValidationService } from '@/lib/services/resultValidationService';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/job-results/[id]/validation
// Returns validation status, history, and approval data for a result
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include'); // 'status', 'history', 'approval', 'all'

    if (!id) {
      return NextResponse.json(
        { error: 'Result ID is required' },
        { status: 400 }
      );
    }

    const validationService = new ResultValidationService();
    
    // Get different data based on query parameter
    switch (include) {
      case 'history':
        const history = await validationService.getValidationHistory(id);
        return NextResponse.json({ history });
        
      case 'approval':
        const approval = await validationService.getApprovalStatus(id);
        return NextResponse.json({ approval });
        
      case 'all':
        const [historyData, approvalData] = await Promise.all([
          validationService.getValidationHistory(id),
          validationService.getApprovalStatus(id)
        ]);
        return NextResponse.json({
          history: historyData,
          approval: approvalData
        });
        
      default: // 'status' or no parameter - return both history and approval
        const [statusHistory, statusApproval] = await Promise.all([
          validationService.getValidationHistory(id),
          validationService.getApprovalStatus(id)
        ]);
        return NextResponse.json({ 
          history: statusHistory,
          approval: statusApproval,
          hasValidation: statusHistory.length > 0
        });
    }
  } catch (error) {
    console.error('Error fetching validation data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch validation data' },
      { status: 500 }
    );
  }
}

// POST /api/job-results/[id]/validation
// Handles validation actions: validate, batchValidate, updateApproval
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, options = {}, status, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Result ID is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const validationService = new ResultValidationService();

    switch (action) {
      case 'validate':
        const validationResult = await validationService.validateResult(id, options);
        return NextResponse.json({ 
          success: true, 
          validation: validationResult 
        });

      case 'batchValidate':
        const { resultIds } = options;
        if (!Array.isArray(resultIds) || resultIds.length === 0) {
          return NextResponse.json(
            { error: 'resultIds array is required for batch validation' },
            { status: 400 }
          );
        }
        
        const batchResults = await validationService.batchValidateResults(resultIds, options);
        return NextResponse.json({ 
          success: true, 
          results: batchResults 
        });

      case 'updateApproval':
        if (!status) {
          return NextResponse.json(
            { error: 'Status is required for approval update' },
            { status: 400 }
          );
        }
        
        const approvalResult = await validationService.updateApprovalStatus(
          id, 
          status, 
          notes
        );
        return NextResponse.json({ 
          success: true, 
          approval: approvalResult 
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing validation action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process validation action' },
      { status: 500 }
    );
  }
} 