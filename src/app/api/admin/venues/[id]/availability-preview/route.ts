import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { validateRequest } from '@/middleware/validationMiddleware'
import { adminAvailabilityPreviewSchema } from '@/lib/validations/adminAvailabilityPreview'
import { AdminAvailabilityPreviewService } from '@/services/adminAvailabilityPreviewService'
import { handleApiError } from '@/utils/errorHandling'
import type { AdminVenueAvailabilityPreviewResponse } from '@/types/api'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)

    const { id } = await context.params
    const body = await validateRequest(request as never, adminAvailabilityPreviewSchema)
    const service = new AdminAvailabilityPreviewService()
    const preview = await service.getVenueAvailabilityPreview({
      venueId: id,
      request: body,
    })

    const response: AdminVenueAvailabilityPreviewResponse = {
      success: true,
      data: preview,
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
