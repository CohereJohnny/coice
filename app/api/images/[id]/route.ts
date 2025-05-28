import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { deleteFile } from '@/lib/gcs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const imageId = params.id;

    // Get image record to verify permissions and get file paths
    const { data: image, error: imageError } = await supabase
      .from('images')
      .select(`
        id,
        gcs_path,
        metadata,
        library_id,
        libraries!inner(
          id,
          catalog_id,
          catalogs!inner(id, name)
        )
      `)
      .eq('id', imageId)
      .single();

    if (imageError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Check user permissions for the catalog
    const { data: userCatalog, error: permissionError } = await supabase
      .from('user_catalogs')
      .select('role')
      .eq('user_id', user.id)
      .eq('catalog_id', (image.libraries as any).catalog_id)
      .single();

    if (permissionError || !userCatalog) {
      return NextResponse.json(
        { error: 'Access denied to catalog' },
        { status: 403 }
      );
    }

    // Only allow deletion if user is Manager or Admin
    if (!['Manager', 'Admin'].includes(userCatalog.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete images' },
        { status: 403 }
      );
    }

    // Extract file paths for deletion
    const filesToDelete: string[] = [];
    
    // Add main image file
    if (image.gcs_path) {
      const fileName = image.gcs_path.replace('gs://' + process.env.GCS_BUCKET_NAME + '/', '');
      filesToDelete.push(fileName);
    }

    // Add thumbnail file if exists
    if (image.metadata && typeof image.metadata === 'object' && 'thumbnail' in image.metadata) {
      const thumbnail = (image.metadata as any).thumbnail;
      if (thumbnail && thumbnail.path) {
        const thumbnailFileName = thumbnail.path.replace('gs://' + process.env.GCS_BUCKET_NAME + '/', '');
        filesToDelete.push(thumbnailFileName);
      }
    }

    // Delete files from GCS
    const deletionResults = await Promise.allSettled(
      filesToDelete.map(fileName => deleteFile(fileName))
    );

    // Log any deletion failures but don't fail the request
    deletionResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to delete file ${filesToDelete[index]}:`, result.reason);
      }
    });

    // Delete image record from database
    const { error: dbError } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      console.error('Database deletion error:', dbError);
      return NextResponse.json(
        { error: 'Failed to delete image record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
      deletedFiles: filesToDelete.length,
    });

  } catch (error) {
    console.error('Image deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const imageId = params.id;

    // Get image record with library and catalog info
    const { data: image, error: imageError } = await supabase
      .from('images')
      .select(`
        *,
        libraries!inner(
          id,
          name,
          catalog_id,
          catalogs!inner(id, name)
        )
      `)
      .eq('id', imageId)
      .single();

    if (imageError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Check user permissions for the catalog
    const { data: userCatalog, error: permissionError } = await supabase
      .from('user_catalogs')
      .select('role')
      .eq('user_id', user.id)
      .eq('catalog_id', (image.libraries as any).catalog_id)
      .single();

    if (permissionError || !userCatalog) {
      return NextResponse.json(
        { error: 'Access denied to catalog' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      image,
      userRole: userCatalog.role,
    });

  } catch (error) {
    console.error('Image fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 