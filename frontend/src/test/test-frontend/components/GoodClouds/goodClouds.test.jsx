import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import GoodClouds from '../../../../components/GoodClouds/GoodClouds.jsx'

describe('GoodClouds Component', () => {
  it('renders four cloud elements', () => {
    const { container } = render(<GoodClouds />)

    expect(container.querySelectorAll('.cloud')).toHaveLength(4)
  })
})
