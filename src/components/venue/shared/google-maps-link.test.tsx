import { render, screen } from '@testing-library/react'
import { GoogleMapsLink } from './google-maps-link'

describe('GoogleMapsLink', () => {
  it('renders default variant with a centered two-line mobile address', () => {
    render(
      <GoogleMapsLink
        address="123 Main St"
        city="Los Angeles"
        state="CA"
        zipCode="90001"
        showArrow
        stackAddressOnMobile
      />
    )

    const button = screen.getByRole('button', {
      name: 'Open 123 Main St, Los Angeles, CA 90001 in Google Maps',
    })

    expect(button).toHaveClass('w-full')
    expect(button).toHaveClass('justify-center')
    expect(button).toHaveClass('sm:justify-start')
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
    expect(screen.getByText('Los Angeles, CA 90001')).toBeInTheDocument()

    const desktopLine = screen.getByText('123 Main St, Los Angeles, CA 90001')
    expect(desktopLine).toHaveClass('hidden')
    expect(desktopLine).toHaveClass('sm:inline')
  })

  it('keeps compact variant on a single line', () => {
    render(
      <GoogleMapsLink
        address="123 Main St"
        city="Los Angeles"
        state="CA"
        zipCode="90001"
        variant="compact"
      />
    )

    expect(screen.getByText('123 Main St, Los Angeles')).toBeInTheDocument()
    expect(screen.queryByText('Los Angeles, CA 90001')).not.toBeInTheDocument()
  })

  it('keeps default variant single-line unless mobile stacking is enabled', () => {
    render(
      <GoogleMapsLink
        address="123 Main St"
        city="Los Angeles"
        state="CA"
        zipCode="90001"
        variant="default"
      />
    )

    expect(screen.getByText('123 Main St, Los Angeles, CA 90001')).toBeInTheDocument()
    expect(screen.queryByText('Los Angeles, CA 90001')).not.toBeInTheDocument()
  })
})
