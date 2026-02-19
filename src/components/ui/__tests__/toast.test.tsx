/**
 * Component tests for Toast UI
 */

import { render, screen } from '@testing-library/react'
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastIcon,
  ToastProvider,
  ToastViewport,
} from '../toast'

describe('Toast components', () => {
  describe('Toast', () => {
    it('renders with default variant', () => {
      render(
        <ToastProvider>
          <Toast data-testid="toast">
            <ToastTitle>Test Title</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      
      const toast = screen.getByTestId('toast')
      expect(toast).toBeInTheDocument()
    })

    it('renders with success variant styling', () => {
      render(
        <ToastProvider>
          <Toast variant="success" data-testid="toast">
            <ToastTitle>Success!</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      
      const toast = screen.getByTestId('toast')
      expect(toast).toHaveClass('bg-primary-400/10')
      expect(toast).toHaveClass('border-primary-400/20')
    })

    it('renders with error variant styling', () => {
      render(
        <ToastProvider>
          <Toast variant="error" data-testid="toast">
            <ToastTitle>Error!</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      
      const toast = screen.getByTestId('toast')
      expect(toast).toHaveClass('bg-destructive/10')
      expect(toast).toHaveClass('border-destructive/20')
    })
  })

  describe('ToastTitle', () => {
    it('renders title text', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle>My Title</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      
      expect(screen.getByText('My Title')).toBeInTheDocument()
    })
  })

  describe('ToastDescription', () => {
    it('renders description text', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastDescription>My Description</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      
      expect(screen.getByText('My Description')).toBeInTheDocument()
    })
  })

  describe('ToastIcon', () => {
    it('renders check icon for success variant', () => {
      render(<ToastIcon variant="success" />)
      
      // The icon is wrapped in a primary circle
      const iconContainer = document.querySelector('.bg-primary-400')
      expect(iconContainer).toBeInTheDocument()
    })

    it('renders exclamation icon for error variant', () => {
      render(<ToastIcon variant="error" />)
      
      // The icon is wrapped in a destructive circle
      const iconContainer = document.querySelector('.bg-destructive')
      expect(iconContainer).toBeInTheDocument()
    })

    it('renders nothing for default variant', () => {
      const { container } = render(<ToastIcon variant="default" />)
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when variant is undefined', () => {
      const { container } = render(<ToastIcon />)
      expect(container.firstChild).toBeNull()
    })
  })
})
