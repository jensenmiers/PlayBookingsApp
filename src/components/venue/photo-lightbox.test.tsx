import { fireEvent, render, screen } from '@testing-library/react'
import { PhotoLightbox } from '@/components/venue/photo-lightbox'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: {
    alt?: string
    fill?: boolean
    priority?: boolean
  } & Record<string, unknown>) => {
    const { alt = '', ...rest } = props
    delete rest.fill
    delete rest.priority

    return <div role="img" aria-label={alt} {...rest} />
  },
}))

describe('PhotoLightbox', () => {
  const photos = [
    'https://example.com/1.jpg',
    'https://example.com/2.jpg',
  ]

  it('uses a centered, viewport-safe media layout', () => {
    render(
      <PhotoLightbox
        photos={photos}
        venueName="Memorial Park"
        currentIndex={0}
        onIndexChange={jest.fn()}
        onClose={jest.fn()}
      />
    )

    const counter = screen.getByText('1 / 2')
    const stack = counter.parentElement
    expect(stack).toHaveClass('mx-auto')
    expect(stack).toHaveStyle({
      paddingTop: 'max(1rem, env(safe-area-inset-top))',
      paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))',
    })

    const mediaStage = screen.getByRole('img', { name: 'Memorial Park photo 1' }).parentElement
    expect(mediaStage).toHaveClass('w-full', 'max-w-5xl')
    expect(mediaStage).not.toHaveClass('mx-l')
  })

  it('closes when the close button is clicked', () => {
    const onClose = jest.fn()

    render(
      <PhotoLightbox
        photos={photos}
        venueName="Memorial Park"
        currentIndex={0}
        onIndexChange={jest.fn()}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /close/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
