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

  it('uses stable shell zones and a centered viewport-safe media stage', () => {
    render(
      <PhotoLightbox
        photos={photos}
        venueName="Memorial Park"
        currentIndex={0}
        onIndexChange={jest.fn()}
        onClose={jest.fn()}
      />
    )

    const shell = screen.getByTestId('photo-lightbox-shell')
    expect(shell).toHaveClass('grid')
    expect(shell).toHaveStyle({
      paddingTop: 'max(1rem, env(safe-area-inset-top))',
      paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))',
    })

    const mediaStage = screen.getByTestId('photo-lightbox-stage')
    expect(mediaStage).toHaveClass('w-full', 'max-w-5xl')
    expect(mediaStage).not.toHaveClass('mx-l')

    const counter = screen.getByText('1 / 2')
    expect(counter.closest('[data-testid="photo-lightbox-footer"]')).toBeInTheDocument()
  })

  it('hides the counter for single-photo venues', () => {
    render(
      <PhotoLightbox
        photos={['https://example.com/solo.jpg']}
        venueName="Memorial Park"
        currentIndex={0}
        onIndexChange={jest.fn()}
        onClose={jest.fn()}
      />
    )

    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument()
  })

  it('handles horizontal swipe gestures between photos for multi-photo venues', () => {
    const onIndexChange = jest.fn()

    render(
      <PhotoLightbox
        photos={photos}
        venueName="Memorial Park"
        currentIndex={0}
        onIndexChange={onIndexChange}
        onClose={jest.fn()}
      />
    )

    const swipeSurface = screen.getByTestId('photo-lightbox-stage')
    fireEvent.mouseDown(swipeSurface, { clientX: 220, clientY: 100 })
    fireEvent.mouseUp(swipeSurface, { clientX: 80, clientY: 100 })

    expect(onIndexChange).toHaveBeenCalledWith(1)
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
