import { NextRequest, NextResponse } from 'next/server';
import { getJobResultService } from '@/lib/services/jobResultService';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Job result ID is required' },
        { status: 400 }
      );
    }

    const jobResultService = getJobResultService();
    const result = await jobResultService.getJobResultById(id);

    if (!result) {
      return NextResponse.json(
        { error: 'Job result not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching job result:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch job result' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Job result ID is required' },
        { status: 400 }
      );
    }

    const jobResultService = getJobResultService();
    const updatedResult = await jobResultService.updateJobResult(id, body);

    return NextResponse.json(updatedResult);
  } catch (error) {
    console.error('Error updating job result:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update job result' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Job result ID is required' },
        { status: 400 }
      );
    }

    const jobResultService = getJobResultService();
    await jobResultService.deleteJobResult(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job result:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete job result' },
      { status: 500 }
    );
  }
} 