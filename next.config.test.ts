import nextConfig from './next.config'

describe('next image configuration', () => {
  it('allows cityofsantamonica bynder images', () => {
    const remotePatterns = nextConfig.images?.remotePatterns ?? []

    const hasBynderHost = remotePatterns.some((pattern) => {
      return (
        typeof pattern === 'object' &&
        'hostname' in pattern &&
        pattern.hostname === 'cityofsantamonica.getbynder.com'
      )
    })

    expect(hasBynderHost).toBe(true)
  })
})

describe('next turbopack configuration', () => {
  it('pins turbopack root to this workspace', () => {
    expect(nextConfig.turbopack?.root).toBe(process.cwd())
  })
})
