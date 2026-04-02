import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import FaceAvatar from '../../../../components/FaceAvatar/FaceAvatar'

describe('FaceAvatar Component', () => {
  it('renders image-based eyes when the eye type has an asset', () => {
    const { container } = render(
      <FaceAvatar
        faceConfig={{
          skinColor: '#cccccc',
          eyeType: 'happy',
          mouthType: 'smile',
        }}
      />
    )

    expect(screen.getByAltText('happy eyes')).toBeInTheDocument()
    expect(container.querySelectorAll('.eye.eye-happy')).toHaveLength(0)
  })

  it('falls back to CSS eyes when the eye type has no image asset', () => {
    const { container } = render(
      <FaceAvatar
        faceConfig={{
          skinColor: '#cccccc',
          eyeType: 'mystery',
          mouthType: 'smile',
        }}
      />
    )

    expect(screen.queryByRole('img', { name: /mystery eyes/i })).not.toBeInTheDocument()
    expect(container.querySelectorAll('.eye.eye-mystery')).toHaveLength(2)
    expect(screen.getByAltText('mouth')).toBeInTheDocument()
  })
})
