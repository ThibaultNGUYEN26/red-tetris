import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}))

vi.mock('../../../components/GoodClouds/GoodClouds.jsx', () => ({
  default: () => <div data-testid="good-clouds" />,
}))

vi.mock('../../../components/TetriminosClouds/TetriminosClouds.jsx', () => ({
  default: () => <div data-testid="tetriminos-clouds" />,
}))

import InfoPage from '../../../InfoPage.jsx'

describe('InfoPage language binding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ question: '2 + 2 ?', token: 'captcha-token' }),
    }))
  })

  it('renders the about page in English by default', () => {
    render(<InfoPage type="about" />)

    expect(screen.getByRole('heading', { name: 'About Red Tetris' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Game Modes' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'À propos de Red Tetris' })).not.toBeInTheDocument()
  })

  it('renders the about page in French when the saved language is French', () => {
    localStorage.setItem('red-tetris-language', 'fr')

    render(<InfoPage type="about" />)

    expect(screen.getByRole('heading', { name: 'À propos de Red Tetris' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Modes de jeu' })).toBeInTheDocument()
  })

  it('renders the contact form in French when the saved language is French', () => {
    localStorage.setItem('red-tetris-language', 'fr')

    render(<InfoPage type="contact" />)

    expect(screen.getByText(/Envoyez vos signalements de bugs/)).toBeInTheDocument()
    expect(screen.getByLabelText('Objet')).toHaveAttribute(
      'placeholder',
      'Signalement de bug ou suggestion'
    )
    expect(screen.getByPlaceholderText('Décrivez le problème ou l’idée...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Envoyer le message' })).toBeInTheDocument()
  })
})
