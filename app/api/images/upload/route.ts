import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { uploadFile, generateStoragePath } from '@/lib/gcs';
import { generateUniqueFileName } from '@/lib/image-utils';
import { generateAndUploadThumbnail, getImageMetadata } from '@/lib/thumbnail';
import { generateImageEmbedding, imageToBase64DataUrl } from '@/lib/services/cohere-embeddings';

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

    // Use service role to bypass RLS issues
    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify library exists and get catalog info
    const { data: library, error: libraryError } = await adminSupabase
      .from('libraries')
      .select('id, catalog_id')
      .eq('id', libraryId)
      .eq('catalog_id', catalogId)
      .single();

    if (libraryError || !library) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this catalog using manual access control
    // Get user's profile to check role
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Get user's groups
    const { data: userGroups } = await adminSupabase
      .from('user_groups')
      .select('group_id')
      .eq('user_id', user.id);

    // Get catalog-group mappings for user's groups
    const groupIds = userGroups?.map(ug => ug.group_id) || [];
    let accessibleCatalogIds: number[] = [];
    
    if (groupIds.length > 0) {
      const { data: catalogGroups } = await adminSupabase
        .from('catalog_groups')
        .select('catalog_id')
        .in('group_id', groupIds);
      
      accessibleCatalogIds = catalogGroups?.map(cg => cg.catalog_id) || [];
    }

    // Get the catalog info
    const { data: catalog } = await adminSupabase
      .from('catalogs')
      .select('id, name, user_id')
      .eq('id', catalogId)
      .single();

    if (!catalog) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 404 });
    }

    // Check access rules
    const hasAccess = 
      catalog.user_id === user.id || // User owns the catalog
      profile?.role === 'admin' || profile?.role === 'manager' || // User is admin/manager
      accessibleCatalogIds.includes(catalog.id); // User has group access

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to catalog' }, { status: 403 });
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

    // Generate embedding for the uploaded image
    let embeddingVector = null;
    try {
      console.log('🔗 Generating embedding for uploaded image...');
      const base64DataUrl = imageToBase64DataUrl(buffer, file.type);
      const embeddingResult = await generateImageEmbedding(base64DataUrl);
      
      if (embeddingResult.success) {
        embeddingVector = embeddingResult.embedding;
        console.log(`✅ Embedding generated successfully: ${embeddingVector.length} dimensions`);
      } else {
        console.error('❌ Embedding generation failed:', embeddingResult.error);
        // Continue with upload even if embedding fails - we can generate it later
      }
    } catch (error) {
      console.error('Error during embedding generation:', error);
      // Continue with upload even if embedding fails
    }

    // Store image record in database using service role
    const { data: imageRecord, error: dbError } = await adminSupabase
      .from('images')
      .insert({
        gcs_path: uploadResult.gcsPath,
        library_id: parseInt(libraryId),
        embedding: embeddingVector, // Include the generated embedding
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

    console.log(`📸 Image uploaded successfully with${embeddingVector ? '' : 'out'} embedding: ${imageRecord.id}`);

    return NextResponse.json({
      success: true,
      image: imageRecord,
      uploadResult,
      thumbnail: thumbnailResult,
      metadata: imageMetadata,
      embedding: {
        generated: !!embeddingVector,
        dimensions: embeddingVector?.length || 0
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 