import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Navigation } from '../navigation'

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockOpenAuthModal = jest.fn()
const mockUseCurrentUser = jest.fn()

let mockPathname = '/'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    className,
    children,
    ...props
  }: {
    href: string
    className?: string
    children: ReactNode
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div aria-label={alt} />,
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => mockPathname,
}))

jest.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

jest.mock('@/contexts/AuthModalContext', () => ({
  useAuthModal: () => ({
    openAuthModal: mockOpenAuthModal,
  }),
}))

describe('Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPathname = '/'
    mockUseCurrentUser.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    })
  })

  it('applies active pill styling to Next Availability when pathname is /search', () => {
    mockPathname = '/search'

    render(<Navigation />)

    const nextAvailabilityLink = screen.getByRole('link', { name: 'Next Availability' })
    expect(nextAvailabilityLink.className).toContain('bg-secondary-50/10')
    expect(nextAvailabilityLink.className).toContain('rounded-full')
    expect(nextAvailabilityLink.className).toContain('text-secondary-50')
  })

  it('applies inactive styling to For Renters on host landing page', () => {
    mockPathname = '/become-a-host'

    render(<Navigation />)

    const forRentersLink = screen.getByRole('link', { name: 'For Renters' })
    expect(forRentersLink.className).toContain('text-secondary-50/70')
    expect(forRentersLink.className).toContain('hover:text-primary-400')
    expect(forRentersLink.className).not.toContain('bg-secondary-50/10')
  })
})
