import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { uploadFile, generateStoragePath } from '@/lib/gcs';
import { generateUniqueFileName } from '@/lib/image-utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const catalogId = formData.get('catalogId') as string;
    const libraryId = formData.get('libraryId') as string;

    if (!file || !catalogId || !libraryId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, catalogId, libraryId' },
        { status: 400 }
      );
    }

    // Verify library access
    const { data: library, error: libraryError } = await supabase
      .from('libraries')
      .select('id, catalog_id, catalogs(id, name)')
      .eq('id', libraryId)
      .eq('catalog_id', catalogId)
      .single();

    if (libraryError || !library) {
      return NextResponse.json(
        { error: 'Library not found or access denied' },
        { status: 404 }
      );
    }

    // Check user permissions for the catalog
    const { data: userCatalog, error: permissionError } = await supabase
      .from('user_catalogs')
      .select('role')
      .eq('user_id', user.id)
      .eq('catalog_id', catalogId)
      .single();

    if (permissionError || !userCatalog) {
      return NextResponse.json(
        { error: 'Access denied to catalog' },
        { status: 403 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename and storage path
    const uniqueFileName = generateUniqueFileName(file.name);
    const storagePath = generateStoragePath(catalogId, libraryId, uniqueFileName);

    // Upload to GCS
    const uploadResult = await uploadFile(buffer, {
      destination: storagePath,
      metadata: {
        originalName: file.name,
        uploadedBy: user.id,
        catalogId,
        libraryId,
        contentType: file.type,
      },
      public: false, // Keep images private
    });

    // Store image record in database
    const { data: imageRecord, error: dbError } = await supabase
      .from('images')
      .insert({
        gcs_path: uploadResult.gcsPath,
        library_id: parseInt(libraryId),
        metadata: {
          filename: uniqueFileName,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          width: null, // Will be updated when metadata is extracted
          height: null,
          exif: null,
          uploaded_by: user.id,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save image record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image: imageRecord,
      uploadResult,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 