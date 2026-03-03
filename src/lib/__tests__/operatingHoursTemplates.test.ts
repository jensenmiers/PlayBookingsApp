import { deriveRegularTemplateWindowsFromOperatingHours } from '@/lib/operatingHoursTemplates'

describe('deriveRegularTemplateWindowsFromOperatingHours', () => {
  it('normalizes and sorts valid operating hour windows', () => {
    const windows = deriveRegularTemplateWindowsFromOperatingHours([
      { day_of_week: 5, start_time: '17:00', end_time: '20:00' },
      { day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00' },
      { day_of_week: 1, start_time: '13:00', end_time: '17:00' },
    ])

    expect(windows).toEqual([
      { day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00' },
      { day_of_week: 1, start_time: '13:00:00', end_time: '17:00:00' },
      { day_of_week: 5, start_time: '17:00:00', end_time: '20:00:00' },
    ])
  })

  it('deduplicates duplicate operating hour windows', () => {
    const windows = deriveRegularTemplateWindowsFromOperatingHours([
      { day_of_week: 2, start_time: '10:00', end_time: '13:00' },
      { day_of_week: 2, start_time: '10:00:00', end_time: '13:00:00' },
    ])

    expect(windows).toEqual([
      { day_of_week: 2, start_time: '10:00:00', end_time: '13:00:00' },
    ])
  })

  it('filters invalid windows', () => {
    const windows = deriveRegularTemplateWindowsFromOperatingHours([
      { day_of_week: 8, start_time: '10:00', end_time: '13:00' },
      { day_of_week: 2, start_time: '14:00', end_time: '13:00' },
      { day_of_week: 2, start_time: 'invalid', end_time: '13:00' },
      { day_of_week: 2, start_time: '10:00', end_time: '13:00' },
    ])

    expect(windows).toEqual([
      { day_of_week: 2, start_time: '10:00:00', end_time: '13:00:00' },
    ])
  })
})
