import { NextRequest, NextResponse } from 'next/server';
import { testConnection, listFiles, getSignedUrl } from '@/lib/gcs';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting GCS Debug Test...');

    // Check environment variables
    const envCheck = {
      hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
      hasBucketName: !!process.env.GCS_BUCKET_NAME,
      hasCredentialsFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      hasPrivateKey: !!process.env.GOOGLE_CLOUD_PRIVATE_KEY,
      hasClientEmail: !!process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      hasClientId: !!process.env.GOOGLE_CLOUD_CLIENT_ID,
      hasPrivateKeyId: !!process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    };

    console.log('📋 Environment Variables Check:', envCheck);

    // Determine configuration method
    const configMethod = process.env.GOOGLE_CLOUD_PRIVATE_KEY ? 'environment_variables' : 'key_file';
    console.log('🔧 Configuration Method:', configMethod);

    // Test GCS connection
    let connectionTest = false;
    let connectionError: string | null = null;
    try {
      connectionTest = await testConnection();
      console.log('🔗 Connection Test Result:', connectionTest);
    } catch (error) {
      connectionError = error instanceof Error ? error.message : 'Unknown connection error';
      console.error('❌ Connection Test Failed:', connectionError);
    }

    if (!connectionTest) {
      return NextResponse.json({
        success: false,
        error: 'GCS connection failed',
        details: connectionError || 'Unable to connect to Google Cloud Storage',
        diagnostics: {
          configMethod,
          envCheck,
          bucketName: process.env.GCS_BUCKET_NAME,
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
          credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        }
      }, { status: 500 });
    }

    // List some files to test access
    let filesList: string[] = [];
    let listError: string | null = null;
    try {
      console.log('📁 Testing file listing...');
      filesList = await listFiles('catalogs/');
      filesList = filesList.slice(0, 5); // Limit to first 5 files
      console.log('📁 Files found:', filesList.length);
    } catch (error) {
      listError = error instanceof Error ? error.message : 'Unknown list error';
      console.error('❌ Failed to list files:', listError);
    }

    // Test signed URL generation for the first file if available
    let signedUrlTest: string | null = null;
    let signedUrlError: string | null = null;
    if (filesList.length > 0) {
      try {
        console.log('🔐 Testing signed URL generation for:', filesList[0]);
        signedUrlTest = await getSignedUrl(filesList[0], 'read', new Date(Date.now() + 60 * 60 * 1000));
        console.log('✅ Signed URL generated successfully');
      } catch (error) {
        signedUrlError = error instanceof Error ? error.message : 'Unknown signed URL error';
        console.error('❌ Failed to generate signed URL:', signedUrlError);
      }
    }

    return NextResponse.json({
      success: true,
      diagnostics: {
        configMethod,
        envCheck,
        gcsConnection: connectionTest,
        connectionError,
        bucketName: process.env.GCS_BUCKET_NAME,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        filesFound: filesList.length,
        listError,
        signedUrlError,
      },
      results: {
        sampleFiles: filesList,
        signedUrlTest: signedUrlTest ? 'Generated successfully' : 'Failed to generate',
        signedUrl: signedUrlTest ? signedUrlTest.substring(0, 100) + '...' : null, // Truncate for security
      }
    });

  } catch (error) {
    console.error('💥 GCS test error:', error);
    return NextResponse.json({
      success: false,
      error: 'GCS test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      diagnostics: {
        hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        hasBucketName: !!process.env.GCS_BUCKET_NAME,
        hasCredentialsFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        hasPrivateKey: !!process.env.GOOGLE_CLOUD_PRIVATE_KEY,
      }
    }, { status: 500 });
  }
} 