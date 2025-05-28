import { NextRequest, NextResponse } from 'next/server';
import { testConnection, listFiles, getSignedUrl } from '@/lib/gcs';

export async function GET(request: NextRequest) {
  try {
    // Test GCS connection
    const connectionTest = await testConnection();
    
    if (!connectionTest) {
      return NextResponse.json({
        error: 'GCS connection failed',
        details: 'Unable to connect to Google Cloud Storage'
      }, { status: 500 });
    }

    // List some files to test access
    let filesList: string[] = [];
    try {
      filesList = await listFiles('catalogs/');
      filesList = filesList.slice(0, 5); // Limit to first 5 files
    } catch (error) {
      console.error('Failed to list files:', error);
    }

    // Test signed URL generation for the first file if available
    let signedUrlTest: string | null = null;
    if (filesList.length > 0) {
      try {
        signedUrlTest = await getSignedUrl(filesList[0], 'read', new Date(Date.now() + 60 * 60 * 1000));
      } catch (error) {
        console.error('Failed to generate signed URL:', error);
      }
    }

    return NextResponse.json({
      success: true,
      gcsConnection: connectionTest,
      bucketName: process.env.GCS_BUCKET_NAME,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      filesFound: filesList.length,
      sampleFiles: filesList,
      signedUrlTest: signedUrlTest ? 'Generated successfully' : 'Failed to generate',
      signedUrl: signedUrlTest
    });

  } catch (error) {
    console.error('GCS test error:', error);
    return NextResponse.json({
      error: 'GCS test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 