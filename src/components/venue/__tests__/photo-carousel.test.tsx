import { render, screen, fireEvent } from '@testing-library/react'
import { PhotoCarousel } from '../photo-carousel'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <img
      alt={props.alt as string}
      data-priority={String(props.priority ?? false)}
      data-sizes={props.sizes as string | undefined}
    />
  ),
}))

const photos = ['/photo1.jpg', '/photo2.jpg', '/photo3.jpg']

describe('PhotoCarousel', () => {
  describe('priority prop', () => {
    it('defaults to no priority on images', () => {
      render(<PhotoCarousel photos={photos} venueName="Test Venue" />)

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img).toHaveAttribute('data-priority', 'false')
      })
    })

    it('sets priority on first image when priority={true}', () => {
      render(
        <PhotoCarousel photos={photos} venueName="Test Venue" priority />
      )

      const images = screen.getAllByRole('img')
      expect(images[0]).toHaveAttribute('data-priority', 'true')
      expect(images[1]).toHaveAttribute('data-priority', 'false')
    })

    it('sets priority on single photo when priority={true}', () => {
      render(
        <PhotoCarousel
          photos={['/single.jpg']}
          venueName="Test Venue"
          priority
        />
      )

      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('data-priority', 'true')
    })
  })

  describe('sizes prop', () => {
    it('passes sizes to images', () => {
      render(
        <PhotoCarousel
          photos={photos}
          venueName="Test Venue"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      )

      const images = screen.getAllByRole('img')
      images.forEach((img) => {
        expect(img).toHaveAttribute(
          'data-sizes',
          '(max-width: 768px) 100vw, 33vw'
        )
      })
    })
  })

  describe('preventNavigation prop', () => {
    it('calls stopPropagation and preventDefault on click when preventNavigation is true', () => {
      render(
        <PhotoCarousel
          photos={photos}
          venueName="Test Venue"
          preventNavigation
        />
      )

      const images = screen.getAllByRole('img')
      const photoDiv = images[0].closest('[data-testid="carousel-photo"]')!
      const event = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(event, 'stopPropagation', {
        value: jest.fn(),
      })
      Object.defineProperty(event, 'preventDefault', {
        value: jest.fn(),
      })

      photoDiv.dispatchEvent(event)

      expect(event.stopPropagation).toHaveBeenCalled()
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('does not interfere with clicks when preventNavigation is false', () => {
      render(<PhotoCarousel photos={photos} venueName="Test Venue" />)

      const images = screen.getAllByRole('img')
      const photoDiv = images[0].closest('[data-testid="carousel-photo"]')!

      // Should not throw when clicking without preventNavigation
      expect(() => fireEvent.click(photoDiv)).not.toThrow()
    })
  })
})
