import { render } from '@testing-library/react'
import { JsonLd } from '@/components/seo/json-ld'

describe('JsonLd', () => {
  it('escapes angle brackets in serialized JSON-LD to prevent script tag injection', () => {
    const { container } = render(
      <JsonLd
        id="venue-jsonld"
        data={{
          '@context': 'https://schema.org',
          name: '</script><script>alert("xss")</script>',
        }}
      />
    )

    const script = container.querySelector('script#venue-jsonld')
    expect(script).not.toBeNull()
    expect(script?.innerHTML).toContain('\\u003c/script>\\u003cscript>alert')
    expect(script?.innerHTML).not.toContain('</script><script>')
  })
})
