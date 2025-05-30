import { NextRequest, NextResponse } from 'next/server';
import { ResultValidationService } from '@/lib/services/resultValidationService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resultId = params.id;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    const validationService = new ResultValidationService();

    switch (action) {
      case 'status':
        {
          // Get current validation status and approval workflow
          const [validationHistory, approvalStatus] = await Promise.all([
            validationService.getValidationHistory(resultId),
            validationService.getApprovalStatus(resultId)
          ]);

          return NextResponse.json({
            success: true,
            data: {
              validationHistory,
              approvalStatus,
              hasValidation: validationHistory.length > 0
            }
          });
        }

      case 'history':
        {
          const validationHistory = await validationService.getValidationHistory(resultId);
          return NextResponse.json({
            success: true,
            data: validationHistory
          });
        }

      case 'approval':
        {
          const approvalStatus = await validationService.getApprovalStatus(resultId);
          return NextResponse.json({
            success: true,
            data: approvalStatus
          });
        }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Validation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch validation data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resultId = params.id;
    const body = await request.json();
    const { action, options, status, reviewerId, notes } = body;

    const validationService = new ResultValidationService();

    switch (action) {
      case 'validate':
        {
          const validationOptions = {
            includeConsistencyCheck: options?.includeConsistencyCheck ?? true,
            compareWithSimilarResults: options?.compareWithSimilarResults ?? true,
            autoApprove: options?.autoApprove ?? false
          };

          const qualityMetrics = await validationService.validateResult(resultId, validationOptions);

          return NextResponse.json({
            success: true,
            data: qualityMetrics
          });
        }

      case 'batchValidate':
        {
          const resultIds = body.resultIds || [resultId];
          const validationOptions = {
            includeConsistencyCheck: options?.includeConsistencyCheck ?? true,
            compareWithSimilarResults: options?.compareWithSimilarResults ?? true,
            autoApprove: options?.autoApprove ?? false
          };

          const batchResults = await validationService.batchValidateResults(resultIds, validationOptions);

          return NextResponse.json({
            success: true,
            data: Object.fromEntries(batchResults)
          });
        }

      case 'updateApproval':
        {
          if (!status || !reviewerId) {
            return NextResponse.json(
              { success: false, error: 'Status and reviewer ID are required' },
              { status: 400 }
            );
          }

          if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json(
              { success: false, error: 'Status must be "approved" or "rejected"' },
              { status: 400 }
            );
          }

          await validationService.updateApprovalStatus(resultId, status, reviewerId, notes);

          return NextResponse.json({
            success: true,
            message: `Result ${status} successfully`
          });
        }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Validation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process validation request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 