import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { uploadFile, generateStoragePath } from '@/lib/gcs';
import { generateUniqueFileName } from '@/lib/image-utils';
import { generateAndUploadThumbnail, getImageMetadata } from '@/lib/thumbnail';

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

    // Check user permissions for the catalog via groups
    const { data: userGroups, error: permissionError } = await supabase
      .from('user_groups')
      .select(`
        group_id,
        groups!inner(
          id,
          catalog_groups!inner(
            catalog_id
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('groups.catalog_groups.catalog_id', catalogId);

    if (permissionError || !userGroups || userGroups.length === 0) {
      return NextResponse.json(
        { error: 'Access denied to catalog' },
        { status: 403 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract image metadata using Sharp
    let imageMetadata;
    try {
      imageMetadata = await getImageMetadata(buffer);
    } catch (error) {
      console.error('Failed to extract image metadata:', error);
      imageMetadata = {
        width: null,
        height: null,
        format: null,
        size: file.size,
      };
    }

    // Generate unique filename and storage path
    const uniqueFileName = generateUniqueFileName(file.name);
    const storagePath = generateStoragePath(catalogId, libraryId, uniqueFileName);

    // Upload original image to GCS
    const uploadResult = await uploadFile(buffer, {
      destination: storagePath,
      metadata: {
        originalName: file.name,
        uploadedBy: user.id,
        catalogId,
        libraryId,
        contentType: file.type,
        width: imageMetadata.width?.toString() || '',
        height: imageMetadata.height?.toString() || '',
      },
      public: false, // Keep images private
    });

    // Generate thumbnail
    let thumbnailResult;
    try {
      thumbnailResult = await generateAndUploadThumbnail(
        buffer,
        catalogId,
        libraryId,
        uniqueFileName,
        {
          width: 300,
          height: 300,
          format: 'jpeg',
          quality: 80,
        }
      );
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      thumbnailResult = null;
    }

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
          width: imageMetadata.width,
          height: imageMetadata.height,
          format: imageMetadata.format,
          density: imageMetadata.density,
          has_alpha: imageMetadata.hasAlpha,
          orientation: imageMetadata.orientation,
          uploaded_by: user.id,
          upload_date: new Date().toISOString(),
          thumbnail: thumbnailResult ? {
            path: thumbnailResult.thumbnailPath,
            width: thumbnailResult.width,
            height: thumbnailResult.height,
            size: thumbnailResult.size,
          } : null,
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
      thumbnail: thumbnailResult,
      metadata: imageMetadata,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 