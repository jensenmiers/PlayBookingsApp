/**
 * Auth Required Dialog Component
 * Reusable dialog component that prompts users to sign in when authentication is required
 */

'use client'

import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface AuthRequiredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  message?: string
}

export function AuthRequiredDialog({
  open,
  onOpenChange,
  title = 'Sign In Required',
  message = 'Please sign in to complete your booking',
}: AuthRequiredDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-primary-600">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/auth/login" onClick={() => onOpenChange(false)}>
              Sign In
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
