import { type NextRequest, NextResponse } from 'next/server'
import { MetaCloudService } from '@/features/whatsapp/services/meta-cloud.service'
import { r2Service } from '@/lib/storage/r2.service'
import { auth } from '@/lib/auth/auth'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string[] }> }
) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return apiError('Unauthorized', 401)
  }

  try {
    const { mediaId } = await params
    const path = mediaId.join('/')
    
    // Check if it's an R2 path (starts with 'organizations/')
    if (path.startsWith('organizations/')) {
      logger.info({ context: { path } }, '[MediaProxy] Fetching from R2')
      const file = await r2Service.download(path)
      
      if (!file) {
        return apiError('File not found in storage', 404)
      }

      // Convert stream to response
      return new NextResponse(file.body as any, {
        headers: {
          'Content-Type': file.contentType,
          'Cache-Control': 'public, max-age=31536000, immutable', // Permanent cache for R2
        },
      })
    }

    // Otherwise, assume it's a Meta Media ID
    logger.info({ context: { path } }, '[MediaProxy] Fetching from Meta')
    const mediaInfo = await MetaCloudService.getMediaUrl(path)
    
    const response = await fetch(mediaInfo.url, {
      headers: {
        Authorization: `Bearer ${MetaCloudService.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch media from Meta: ${response.statusText}`)
    }

    const audioBuffer = await response.arrayBuffer()
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': mediaInfo.mime_type,
        'Content-Length': mediaInfo.file_size.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    logger.error({ err: error }, '[MediaProxy] Error proxying media')
    return apiError('Failed to load media', 500)
  }
}
