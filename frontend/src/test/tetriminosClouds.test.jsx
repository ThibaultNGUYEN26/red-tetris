import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import TetriminosClouds from '../components/TetriminosClouds/TetriminosClouds.jsx'

describe('TetriminosClouds Component', () => {
  it('renders all seven decorative tetrimino clouds', () => {
    const { container } = render(<TetriminosClouds />)

    expect(container.querySelector('.tetriminos-cloud-i')).toBeInTheDocument()
    expect(container.querySelector('.tetriminos-cloud-o')).toBeInTheDocument()
    expect(container.querySelector('.tetriminos-cloud-t')).toBeInTheDocument()
    expect(container.querySelector('.tetriminos-cloud-l')).toBeInTheDocument()
    expect(container.querySelector('.tetriminos-cloud-j')).toBeInTheDocument()
    expect(container.querySelector('.tetriminos-cloud-z')).toBeInTheDocument()
    expect(container.querySelector('.tetriminos-cloud-s')).toBeInTheDocument()
  })
})
