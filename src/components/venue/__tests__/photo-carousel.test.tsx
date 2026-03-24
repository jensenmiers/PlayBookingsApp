import { render, screen, fireEvent } from '@testing-library/react'
import { PhotoCarousel } from '../photo-carousel'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    alt,
    onClick,
    priority,
    sizes,
  }: {
    alt: string
    onClick?: React.MouseEventHandler<HTMLImageElement>
    priority?: boolean
    sizes?: string
  }) => (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        data-priority={String(priority ?? false)}
        data-sizes={sizes}
        onClick={onClick}
      />
    </>
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

  describe('onPhotoTap prop', () => {
    it('calls onPhotoTap when a single photo is clicked', () => {
      const onPhotoTap = jest.fn()

      render(
        <PhotoCarousel
          photos={['/single.jpg']}
          venueName="Test Venue"
          onPhotoTap={onPhotoTap}
        />
      )

      fireEvent.click(screen.getByRole('img'))

      expect(onPhotoTap).toHaveBeenCalledWith(0)
    })

    it('calls onPhotoTap with the clicked photo index for multi-photo carousels', () => {
      const onPhotoTap = jest.fn()

      render(
        <PhotoCarousel
          photos={photos}
          venueName="Test Venue"
          onPhotoTap={onPhotoTap}
        />
      )

      const photoSurfaces = screen.getAllByTestId('carousel-photo')
      fireEvent.click(photoSurfaces[1])

      expect(onPhotoTap).toHaveBeenCalledWith(1)
    })
  })
})
