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
      expect(toast).toHaveClass('bg-green-50')
      expect(toast).toHaveClass('border-green-200')
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
      expect(toast).toHaveClass('bg-red-50')
      expect(toast).toHaveClass('border-red-200')
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
      
      // The icon is wrapped in a green circle
      const iconContainer = document.querySelector('.bg-green-500')
      expect(iconContainer).toBeInTheDocument()
    })

    it('renders exclamation icon for error variant', () => {
      render(<ToastIcon variant="error" />)
      
      // The icon is wrapped in a red circle
      const iconContainer = document.querySelector('.bg-red-500')
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
