import { NextRequest, NextResponse } from 'next/server';
import { getCohereService, resetCohereService } from '@/lib/services/cohere';

export async function GET(request: NextRequest) {
  try {
    // Get current environment variables
    const envConfig = {
      COHERE_API_KEY: process.env.COHERE_API_KEY ? `${process.env.COHERE_API_KEY.slice(0, 8)}...` : 'undefined',
      COHERE_BASE_URL: process.env.COHERE_BASE_URL,
      COHERE_VISION_MODEL: process.env.COHERE_VISION_MODEL,
    };

    // Get current service status
    const cohereService = getCohereService();
    const status = cohereService.getStatus();

    return NextResponse.json({
      environment: envConfig,
      serviceStatus: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'reset') {
      // Reset the singleton to pick up new environment variables
      resetCohereService();
      
      // Get the new service instance
      const cohereService = getCohereService();
      const status = cohereService.getStatus();
      
      return NextResponse.json({
        message: 'Cohere service reset successfully',
        serviceStatus: status,
        environment: {
          COHERE_API_KEY: process.env.COHERE_API_KEY ? `${process.env.COHERE_API_KEY.slice(0, 8)}...` : 'undefined',
          COHERE_BASE_URL: process.env.COHERE_BASE_URL,
          COHERE_VISION_MODEL: process.env.COHERE_VISION_MODEL,
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use action: "reset"' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 