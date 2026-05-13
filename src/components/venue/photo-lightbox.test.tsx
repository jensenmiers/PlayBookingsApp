import { fireEvent, render, screen, within } from '@testing-library/react'
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

    expect(screen.getByRole('dialog')).toHaveClass('h-dvh')

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

  it('renders visible mobile-safe navigation controls for multi-photo venues', () => {
    render(
      <PhotoLightbox
        photos={photos}
        venueName="Memorial Park"
        currentIndex={0}
        onIndexChange={jest.fn()}
        onClose={jest.fn()}
      />
    )

    const footer = screen.getByTestId('photo-lightbox-footer')
    expect(footer).toHaveClass('fixed', 'bottom-0')

    const controls = within(footer).getByTestId('photo-lightbox-controls')
    expect(within(controls).getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(within(controls).getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(within(controls).getByText('1 / 2')).toBeInTheDocument()
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
    expect(screen.queryByTestId('photo-lightbox-controls')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
  })

  it('navigates with control buttons while preserving edge disabled states', () => {
    const onIndexChange = jest.fn()
    const { rerender } = render(
      <PhotoLightbox
        photos={photos}
        venueName="Memorial Park"
        currentIndex={0}
        onIndexChange={onIndexChange}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    const nextButton = screen.getByRole('button', { name: /next/i })
    expect(nextButton).toBeEnabled()

    fireEvent.click(nextButton)
    expect(onIndexChange).toHaveBeenCalledWith(1)

    rerender(
      <PhotoLightbox
        photos={photos}
        venueName="Memorial Park"
        currentIndex={1}
        onIndexChange={onIndexChange}
        onClose={jest.fn()}
      />
    )

    const previousButton = screen.getByRole('button', { name: /previous/i })
    expect(previousButton).toBeEnabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()

    fireEvent.click(previousButton)
    expect(onIndexChange).toHaveBeenCalledWith(0)
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
