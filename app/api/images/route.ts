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
        { error: 'Missing required parameters: libraryId, catalogId' },
        { status: 400 }
      )
    }

    // Verify library access
    const { data: library, error: libraryError } = await supabase
      .from('libraries')
      .select('id, catalog_id, catalogs(id, name)')
      .eq('id', libraryId)
      .eq('catalog_id', catalogId)
      .single()

    if (libraryError || !library) {
      return NextResponse.json(
        { error: 'Library not found or access denied' },
        { status: 404 }
      )
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

    // Get images with pagination
    const { data: images, error: imagesError, count } = await supabase
      .from('images')
      .select('*', { count: 'exact' })
      .eq('library_id', libraryId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (imagesError) {
      console.error('Images query error:', imagesError)
      return NextResponse.json(
        { error: 'Failed to fetch images' },
        { status: 500 }
      )
    }

    // Generate signed URLs for images
    const imagesWithUrls = await Promise.all(
      (images || []).map(async (image) => {
        try {
          // Extract filename from GCS path
          const fileName = image.gcs_path.replace('gs://' + process.env.GCS_BUCKET_NAME + '/', '')
          const signedUrl = await getSignedUrl(fileName, 'read')
          
          return {
            ...image,
            signedUrl,
          }
        } catch (error) {
          console.error(`Failed to generate signed URL for image ${image.id}:`, error)
          return {
            ...image,
            signedUrl: null,
          }
        }
      })
    )

    return NextResponse.json({
      images: imagesWithUrls,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })

  } catch (error) {
    console.error('Images list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST() {
  // TODO: Implement image upload in Sprint 5
  return NextResponse.json({ message: 'Image upload - to be implemented' })
} 