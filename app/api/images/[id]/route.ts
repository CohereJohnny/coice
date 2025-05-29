import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { deleteFile, getSignedUrl } from '@/lib/gcs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const imageId = id;

    // Use service role to bypass RLS issues
    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get image record with library and catalog info
    const { data: image, error: imageError } = await adminSupabase
      .from('images')
      .select(`
        id,
        gcs_path,
        metadata,
        library_id,
        libraries!inner(
          id,
          catalog_id,
          catalogs!inner(id, name, user_id)
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

    // Check user's profile role for deletion permissions
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const catalog = (image.libraries as any).catalogs;

    // Check access rules for deletion (only owners, managers, and admins can delete)
    const hasDeleteAccess = 
      catalog.user_id === user.id || // User owns the catalog
      profile?.role === 'admin' || profile?.role === 'manager'; // User is admin/manager

    if (!hasDeleteAccess) {
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
    const { error: dbError } = await adminSupabase
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const imageId = id;
    
    // Check if this is a request for a signed URL
    const url = new URL(request.url);
    const requestSignedUrl = url.searchParams.get('signed') === 'true';

    // Use service role to bypass RLS issues
    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get image record with library and catalog info
    const { data: image, error: imageError } = await adminSupabase
      .from('images')
      .select(`
        *,
        libraries!inner(
          id,
          name,
          catalog_id,
          catalogs!inner(id, name, user_id)
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

    const catalog = (image.libraries as any).catalogs;

    // Check access rules
    const hasAccess = 
      catalog.user_id === user.id || // User owns the catalog
      profile?.role === 'admin' || // User is admin
      accessibleCatalogIds.includes(catalog.id); // User has group access

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // If requesting a signed URL, generate it and return
    if (requestSignedUrl && image.gcs_path) {
      try {
        // Extract the file path from the GCS path
        const fileName = image.gcs_path.replace(`gs://${process.env.GCS_BUCKET_NAME}/`, '');
        
        // Generate signed URL valid for 1 hour
        const expires = new Date(Date.now() + 60 * 60 * 1000);
        const signedUrl = await getSignedUrl(fileName, 'read', expires);
        
        return NextResponse.json({
          success: true,
          signedUrl,
          expiresAt: expires.toISOString(),
          imageId: image.id,
        });
      } catch (error) {
        console.error('Failed to generate signed URL:', error);
        return NextResponse.json(
          { error: 'Failed to generate signed URL' },
          { status: 500 }
        );
      }
    }

    // Return regular image metadata
    return NextResponse.json({
      image: {
        id: image.id,
        filename: image.filename,
        size: image.size,
        mime_type: image.mime_type,
        gcs_path: image.gcs_path,
        metadata: image.metadata,
        created_at: image.created_at,
        updated_at: image.updated_at,
        library: {
          id: image.libraries.id,
          name: image.libraries.name,
          catalog_id: image.libraries.catalog_id,
        },
      },
    });

  } catch (error) {
    console.error('Image fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 