/**
 * Unit tests for useToast hook and reducer
 */

import { reducer } from '../use-toast'

describe('toast reducer', () => {
  const createToast = (id: string, overrides = {}) => ({
    id,
    title: `Toast ${id}`,
    open: true,
    ...overrides,
  })

  describe('ADD_TOAST', () => {
    it('adds a toast to empty state', () => {
      const state = { toasts: [] }
      const toast = createToast('1')
      
      const result = reducer(state, { type: 'ADD_TOAST', toast })
      
      expect(result.toasts).toHaveLength(1)
      expect(result.toasts[0].id).toBe('1')
    })

    it('adds new toasts to the beginning of the list', () => {
      const state = { toasts: [createToast('1')] }
      const newToast = createToast('2')
      
      const result = reducer(state, { type: 'ADD_TOAST', toast: newToast })
      
      expect(result.toasts[0].id).toBe('2')
      expect(result.toasts[1].id).toBe('1')
    })

    it('respects TOAST_LIMIT of 3', () => {
      const state = {
        toasts: [createToast('1'), createToast('2'), createToast('3')],
      }
      const newToast = createToast('4')
      
      const result = reducer(state, { type: 'ADD_TOAST', toast: newToast })
      
      expect(result.toasts).toHaveLength(3)
      expect(result.toasts[0].id).toBe('4')
      expect(result.toasts[2].id).toBe('2') // '3' was pushed out
    })
  })

  describe('UPDATE_TOAST', () => {
    it('updates an existing toast by id', () => {
      const state = { toasts: [createToast('1', { title: 'Original' })] }
      
      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated' },
      })
      
      expect(result.toasts[0].title).toBe('Updated')
    })

    it('does not modify other toasts', () => {
      const state = {
        toasts: [
          createToast('1', { title: 'First' }),
          createToast('2', { title: 'Second' }),
        ],
      }
      
      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated First' },
      })
      
      expect(result.toasts[0].title).toBe('Updated First')
      expect(result.toasts[1].title).toBe('Second')
    })
  })

  describe('DISMISS_TOAST', () => {
    it('sets open to false for specific toast', () => {
      const state = {
        toasts: [
          createToast('1', { open: true }),
          createToast('2', { open: true }),
        ],
      }
      
      const result = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' })
      
      expect(result.toasts[0].open).toBe(false)
      expect(result.toasts[1].open).toBe(true)
    })

    it('sets open to false for all toasts when no id provided', () => {
      const state = {
        toasts: [
          createToast('1', { open: true }),
          createToast('2', { open: true }),
        ],
      }
      
      const result = reducer(state, { type: 'DISMISS_TOAST' })
      
      expect(result.toasts[0].open).toBe(false)
      expect(result.toasts[1].open).toBe(false)
    })
  })

  describe('REMOVE_TOAST', () => {
    it('removes specific toast by id', () => {
      const state = {
        toasts: [createToast('1'), createToast('2')],
      }
      
      const result = reducer(state, { type: 'REMOVE_TOAST', toastId: '1' })
      
      expect(result.toasts).toHaveLength(1)
      expect(result.toasts[0].id).toBe('2')
    })

    it('removes all toasts when no id provided', () => {
      const state = {
        toasts: [createToast('1'), createToast('2'), createToast('3')],
      }
      
      const result = reducer(state, { type: 'REMOVE_TOAST' })
      
      expect(result.toasts).toHaveLength(0)
    })

    it('does nothing when toast id not found', () => {
      const state = { toasts: [createToast('1')] }
      
      const result = reducer(state, { type: 'REMOVE_TOAST', toastId: 'nonexistent' })
      
      expect(result.toasts).toHaveLength(1)
    })
  })
})
