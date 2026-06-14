import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('../../../index.jsx', () => ({
  default: () => (
    <button
      type="button"
      onClick={() => {
        localStorage.setItem('red-tetris-language', 'fr')
        window.dispatchEvent(new Event('red-tetris-language-change'))
      }}
    >
      French
    </button>
  ),
}))

vi.mock('../../../Spectate.jsx', () => ({
  default: () => <div data-testid="spectate" />,
}))

vi.mock('../../../InfoPage.jsx', () => ({
  default: () => <div data-testid="info-page" />,
}))

vi.mock('../../../AdminPage.jsx', () => ({
  default: () => <div data-testid="admin-page" />,
}))

vi.mock('../../../components/StorageConsent/StorageConsent.jsx', () => ({
  default: () => null,
}))

import App from '../../../App.jsx'

describe('App footer links language', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.pushState({}, '', '/')
  })

  it('updates footer links when the saved language changes to French', () => {
    render(<App />)

    expect(screen.getByRole('navigation', { name: 'Site information' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Terms' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'French' }))

    expect(screen.getByRole('navigation', { name: 'Informations du site' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'A propos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conditions' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Confidentialite' })).toBeInTheDocument()
  })
})
