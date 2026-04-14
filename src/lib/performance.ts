type PerformanceLogPayload = Record<string, number | string | boolean | null | undefined>

export function startMeasurement(): number {
  return performance.now()
}

export function measureDurationMs(startTime: number): number {
  return Number((performance.now() - startTime).toFixed(1))
}

export function logPerformance(
  scope: string,
  payload: PerformanceLogPayload
) {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  if (process.env.PLAYBOOKINGS_PERF_LOGS !== '1') {
    return
  }

  console.info(`[perf] ${scope}`, payload)
}
