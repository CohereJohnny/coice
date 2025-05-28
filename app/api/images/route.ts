import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getSignedUrl } from '@/lib/gcs'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const libraryId = searchParams.get('libraryId')
    const catalogId = searchParams.get('catalogId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    if (!libraryId || !catalogId) {
      return NextResponse.json(
        { error: 'Missing required parameters: libraryId and catalogId' },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS issues
    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // Fetch images with pagination
    const { data: images, error: imagesError, count } = await adminSupabase
      .from('images')
      .select('*', { count: 'exact' })
      .eq('library_id', libraryId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (imagesError) {
      return NextResponse.json(
        { error: 'Failed to fetch images', details: imagesError.message },
        { status: 500 }
      );
    }

    // Generate signed URLs for all images
    const imagesWithSignedUrls = await Promise.all(
      (images || []).map(async (image) => {
        let signedUrls: { original?: string; thumbnail?: string } = {};
        
        try {
          console.log(`Processing image ${image.id}, metadata:`, JSON.stringify(image.metadata, null, 2));
          
          // Generate signed URL for thumbnail if exists (prioritize thumbnail for list view)
          if (image.metadata && typeof image.metadata === 'object' && 'thumbnail' in image.metadata) {
            const thumbnail = (image.metadata as any).thumbnail;
            if (thumbnail && thumbnail.path) {
              try {
                const thumbnailFileName = thumbnail.path.replace('gs://' + process.env.GCS_BUCKET_NAME + '/', '');
                console.log(`Generating thumbnail signed URL for: ${thumbnailFileName}`);
                signedUrls.thumbnail = await getSignedUrl(thumbnailFileName, 'read', new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
                console.log(`Thumbnail signed URL generated successfully`);
              } catch (thumbnailError) {
                console.error(`Failed to generate thumbnail signed URL, will use original:`, thumbnailError);
                // Thumbnail failed, we'll use original image below
              }
            }
          }

          // Generate signed URL for original image (always try this as fallback)
          if (image.gcs_path) {
            const fileName = image.gcs_path.replace('gs://' + process.env.GCS_BUCKET_NAME + '/', '');
            console.log(`Generating original signed URL for: ${fileName}`);
            signedUrls.original = await getSignedUrl(fileName, 'read', new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
            console.log(`Original signed URL generated successfully`);
            
            // If no thumbnail URL was generated, use original as thumbnail too
            if (!signedUrls.thumbnail) {
              signedUrls.thumbnail = signedUrls.original;
              console.log(`Using original image as thumbnail fallback`);
            }
          }
          
          console.log(`Final signedUrls for image ${image.id}:`, signedUrls);
        } catch (error) {
          console.error(`Failed to generate signed URLs for image ${image.id}:`, error);
          // Continue without signed URLs for this image
        }

        return {
          ...image,
          signedUrls
        };
      })
    );

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      images: imagesWithSignedUrls,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('Images fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  // TODO: Implement image upload in Sprint 5
  return NextResponse.json({ message: 'Image upload - to be implemented' })
} 