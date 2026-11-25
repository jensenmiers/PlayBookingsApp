import {
  getStripeElementsAppearance,
  getStripeElementsFonts,
} from '@/lib/stripeAppearance'

describe('stripeAppearance', () => {
  it('uses Cal Sans UI as the Stripe Elements font family', () => {
    expect(getStripeElementsAppearance().variables?.fontFamily).toContain('Cal Sans UI')
  })

  it('allows appearance variable overrides without dropping Cal Sans UI', () => {
    const appearance = getStripeElementsAppearance({
      colorPrimary: 'var(--primary-600)',
    })

    expect(appearance.variables?.colorPrimary).toBe('var(--primary-600)')
    expect(appearance.variables?.fontFamily).toContain('Cal Sans UI')
  })

  it('points Stripe custom fonts at public Cal Sans UI files', () => {
    const fonts = getStripeElementsFonts('https://www.playbookings.com')

    expect(fonts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          family: 'Cal Sans UI',
          src: 'url(https://www.playbookings.com/fonts/CalSansUI-Regular.woff2)',
          weight: '400',
        }),
        expect.objectContaining({
          family: 'Cal Sans UI',
          src: 'url(https://www.playbookings.com/fonts/CalSansUI-Bold.woff2)',
          weight: '700',
        }),
      ])
    )
    expect(fonts).toHaveLength(4)
  })
})
