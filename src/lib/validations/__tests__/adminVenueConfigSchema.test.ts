import { updateVenueAdminConfigSchema } from '../adminVenueConfig'

describe('updateVenueAdminConfigSchema', () => {
  it('does not accept legacy insurance manual-approval fields', () => {
    const parsed = updateVenueAdminConfigSchema.parse({
      instant_booking: true,
      insurance_required: true,
      insurance_requires_manual_approval: true,
      insurance_document_types: ['COI'],
    })

    expect(parsed.instant_booking).toBe(true)
    expect(parsed.insurance_required).toBe(true)
    expect(parsed).not.toHaveProperty('insurance_requires_manual_approval')
    expect(parsed).not.toHaveProperty('insurance_document_types')
  })
})
