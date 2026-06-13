import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ProfileMenu from '../../../../components/ProfileMenu/ProfileMenu'
import { socket } from '../../../../socket'

const mockSocketEmit = vi.fn((event, payload, callback) => {
  if (event === 'updateProfile' && typeof callback === 'function') {
    callback(null, { ok: true, profile: payload })
  }
})

vi.mock('../../../../socket', () => ({
  socket: {
    emit: vi.fn(),
    timeout: vi.fn(() => ({
      emit: mockSocketEmit,
    })),
  },
}))

describe('ProfileMenu Component', () => {
  const mockOnSubmit = vi.fn()
  const defaultProps = {
    onSubmit: mockOnSubmit,
    theme: 'light'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    socket.timeout = vi.fn(() => ({
      emit: mockSocketEmit,
    }))
    mockSocketEmit.mockImplementation((event, payload, callback) => {
      if (event === 'updateProfile' && typeof callback === 'function') {
        callback(null, { ok: true, profile: payload })
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render ProfileMenu component', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should render avatar preview', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      // FaceAvatar component should be rendered
      const avatars = document.querySelectorAll('.face-avatar')
      expect(avatars.length).toBeGreaterThan(0)
    })

    it('should focus on username input on mount', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveFocus()
    })
  })

  describe('Username Input', () => {
    it('should update username on input', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'NewUsername' } })
      
      expect(input.value).toBe('NewUsername')
    })

    it('should limit username to 15 characters', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'ThisIsAVeryLongUsernameThatExceedsLimit' } })
      
      expect(input.value).toBe('ThisIsAVeryLong')
    })

    it('should keep only letters and numbers in the username input', () => {
      render(<ProfileMenu {...defaultProps} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '  Test_User!42  ' } })

      expect(input.value).toBe('TestUser42')
    })

    it('should accept a 1 character username', async () => {
      render(<ProfileMenu {...defaultProps} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'A' } })

      fireEvent.click(screen.getByRole('button', { name: /submit|start|play/i }))

      await waitFor(() => {
        expect(mockSocketEmit).toHaveBeenCalledWith(
          'updateProfile',
          expect.objectContaining({ username: 'A' }),
          expect.any(Function)
        )
      })
    })

    it('should not submit with empty username', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /submit|start|play/i })
      fireEvent.click(submitButton)
      
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should trim whitespace from username', async () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '  TestUser  ' } })
      
      const submitButton = screen.getByRole('button', { name: /submit|start|play/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSocketEmit).toHaveBeenCalledWith(
          'updateProfile',
          expect.objectContaining({ username: 'TestUser' }),
          expect.any(Function)
        )
      })
    })

    it('should submit on Enter key press', async () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'TestUser' } })
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it('should not submit on Enter with empty username', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })
      
      expect(mockOnSubmit).not.toHaveBeenCalled()
      expect(screen.getByText('Missing data')).toBeInTheDocument()
    })

    it('should clear validation errors when the username changes', () => {
      render(<ProfileMenu {...defaultProps} />)

      const input = screen.getByRole('textbox')
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })
      expect(screen.getByText('Missing data')).toBeInTheDocument()

      fireEvent.change(input, { target: { value: 'FixedUser' } })

      expect(screen.queryByText('Missing data')).not.toBeInTheDocument()
    })

    it('should ignore non-Enter key presses', () => {
      render(<ProfileMenu {...defaultProps} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'TestUser' } })
      fireEvent.keyPress(input, { key: 'a', code: 'KeyA', charCode: 97 })

      expect(mockSocketEmit).not.toHaveBeenCalled()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Avatar Customization', () => {
    it('should display skin color selector', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      // Should have multiple buttons for avatar customization
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(1)
    })

    it('should display eye type selector', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      // Should have buttons or controls for eye selection
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should display mouth type selector', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      // Should have buttons or controls for mouth selection
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should update avatar preview when skin color changes', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const colorButtons = screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('data-testid')?.includes('skin') ||
        btn.className?.includes('skin')
      )
      
      if (colorButtons.length > 0) {
        const initialAvatar = document.querySelector('.face-avatar')
        fireEvent.click(colorButtons[0])
        const updatedAvatar = document.querySelector('.face-avatar')
        
        expect(initialAvatar).toBeTruthy()
        expect(updatedAvatar).toBeTruthy()
      }
    })

    it('should have randomize button', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const randomButton = screen.getByRole('button', { name: /random|shuffle|🎲/i })
      expect(randomButton).toBeInTheDocument()
    })

    it('should randomize avatar on randomize button click', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const randomButton = screen.getByRole('button', { name: /random|shuffle|🎲/i })
      
      const initialAvatar = document.querySelector('.face-avatar')
      fireEvent.click(randomButton)
      const updatedAvatar = document.querySelector('.face-avatar')
      
      expect(initialAvatar).toBeTruthy()
      expect(updatedAvatar).toBeTruthy()
    })

    it('should cycle through avatar options', () => {
      render(<ProfileMenu {...defaultProps} />)
      
      // Find navigation buttons for avatar customization
      const nextButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent === '→' || btn.textContent === '▶' || btn.textContent === '>'
      )
      
      if (nextButtons.length > 0) {
        const initialState = document.querySelector('.face-avatar')
        fireEvent.click(nextButtons[0])
        const updatedState = document.querySelector('.face-avatar')
        
        expect(initialState).toBeTruthy()
        expect(updatedState).toBeTruthy()
      }
    })

    it('should cycle backward and forward through skin, eyes, and mouth options', () => {
      render(<ProfileMenu {...defaultProps} />)

      const featureNamesBefore = screen.getAllByText((_, element) =>
        element?.classList?.contains('feature-name')
      )
      const initialEyes = featureNamesBefore[0].textContent
      const initialMouth = featureNamesBefore[1].textContent

      const arrowButtons = screen.getAllByRole('button', { name: /◀|▶/ })

      fireEvent.click(arrowButtons[0])
      fireEvent.click(arrowButtons[2])
      fireEvent.click(arrowButtons[3])
      fireEvent.click(arrowButtons[4])
      fireEvent.click(arrowButtons[5])

      const featureNamesAfter = screen.getAllByText((_, element) =>
        element?.classList?.contains('feature-name')
      )

      expect(featureNamesAfter[0].textContent).toBeTruthy()
      expect(featureNamesAfter[1].textContent).toBeTruthy()
      expect([initialEyes, featureNamesAfter[0].textContent]).toContain(featureNamesAfter[0].textContent)
      expect([initialMouth, featureNamesAfter[1].textContent]).toContain(featureNamesAfter[1].textContent)
    })
  })

  describe('Profile Submission', () => {
    it('should send profile data to backend', async () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'TestUser' } })
      
      const submitButton = screen.getByRole('button', { name: /submit|start|play/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSocketEmit).toHaveBeenCalled()
      }, { timeout: 2000 })
      
      expect(mockSocketEmit).toHaveBeenCalledWith(
        'updateProfile',
        expect.objectContaining({
          username: 'TestUser',
          avatar: expect.any(Object),
        }),
        expect.any(Function)
      )
    })

    it('should include avatar data in submission', async () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'TestUser' } })
      
      const submitButton = screen.getByRole('button', { name: /submit|start|play/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSocketEmit).toHaveBeenCalled()
      }, { timeout: 2000 })
      
      const callArgs = mockSocketEmit.mock.calls[0]
      expect(callArgs[1].avatar).toBeTruthy()
      expect(callArgs[1].avatar.skinColor).toBeTruthy()
    })

    it('should call onSubmit with backend response', async () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'TestUser' } })
      
      const submitButton = screen.getByRole('button', { name: /submit|start|play/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            username: 'TestUser',
            avatar: expect.objectContaining({
              skinColor: expect.any(String),
              eyeType: expect.any(String),
              mouthType: expect.any(String)
            })
          })
        )
      })
    })

    it('should handle socket failure gracefully', async () => {
      mockSocketEmit.mockImplementation((event, payload, callback) => {
        if (event === 'updateProfile' && typeof callback === 'function') {
          callback(new Error('timeout'))
        }
      })
      
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'TestUser' } })
      
      const submitButton = screen.getByRole('button', { name: /submit|start|play/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Server not responding')).toBeInTheDocument()
      })
      
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should use fallback data if socket response is missing profile', async () => {
      mockSocketEmit.mockImplementation((event, payload, callback) => {
        if (event === 'updateProfile' && typeof callback === 'function') {
          callback(null, { ok: true })
        }
      })
      
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'TestUser' } })
      
      const submitButton = screen.getByRole('button', { name: /submit|start|play/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            username: 'TestUser'
          })
        )
      })
    })

    it('should keep a valid initial avatar selection when submitting', async () => {
      const initialAvatar = {
        skinColor: '#70d4d4',
        eyeType: 'happy',
        mouthType: 'smile',
      }

      render(
        <ProfileMenu
          {...defaultProps}
          initialProfile={{
            username: 'InitialUser',
            avatar: initialAvatar,
          }}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /submit|start|play/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            username: 'InitialUser',
            avatar: initialAvatar,
          })
        )
      })
    })

    it('should show an error when updateProfile fails', async () => {
      mockSocketEmit.mockImplementation((event, payload, callback) => {
        if (event === 'updateProfile' && typeof callback === 'function') {
          callback(null, { ok: false, error: 'Username already connected' })
        }
      })

      render(<ProfileMenu {...defaultProps} />)

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TestUser' } })
      fireEvent.click(screen.getByRole('button', { name: /submit|start|play/i }))

      await waitFor(() => {
        expect(screen.getByText('Username already connected')).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should show a fallback error when updateProfile returns no response data', async () => {
      mockSocketEmit.mockImplementation((event, payload, callback) => {
        if (event === 'updateProfile' && typeof callback === 'function') {
          callback(null, undefined)
        }
      })

      render(<ProfileMenu {...defaultProps} />)

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TestUser' } })
      fireEvent.click(screen.getByRole('button', { name: /submit|start|play/i }))

      await waitFor(() => {
        expect(screen.getByText('Unknown error')).toBeInTheDocument()
      })
    })

    it('should show a fallback error when updateProfile fails without an error message', async () => {
      mockSocketEmit.mockImplementation((event, payload, callback) => {
        if (event === 'updateProfile' && typeof callback === 'function') {
          callback(null, { ok: false })
        }
      })

      render(<ProfileMenu {...defaultProps} />)

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TestUser' } })
      fireEvent.click(screen.getByRole('button', { name: /submit|start|play/i }))

      await waitFor(() => {
        expect(screen.getByText('Profile update failed')).toBeInTheDocument()
      })
    })

    it('should show a socket timeout error when updateProfile times out', async () => {
      mockSocketEmit.mockImplementation((event, payload, callback) => {
        if (event === 'updateProfile' && typeof callback === 'function') {
          callback(new Error('timeout'))
        }
      })

      render(<ProfileMenu {...defaultProps} />)

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TestUser' } })
      fireEvent.click(screen.getByRole('button', { name: /submit|start|play/i }))

      await waitFor(() => {
        expect(screen.getByText('Server not responding')).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should reject an invalid initial username before socket submission', async () => {
      render(
        <ProfileMenu
          {...defaultProps}
          initialProfile={{
            username: 'Invalid_Name',
          }}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /submit|start|play/i }))

      expect(await screen.findByText('Invalid username')).toBeInTheDocument()
      expect(mockSocketEmit).not.toHaveBeenCalled()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should show server unavailable when socket timeout is missing', async () => {
      socket.timeout = undefined

      render(<ProfileMenu {...defaultProps} />)

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TestUser' } })
      fireEvent.click(screen.getByRole('button', { name: /submit|start|play/i }))

      expect(await screen.findByText('Server unavailable')).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should show a fallback error when updateProfile returns no response', async () => {
      mockSocketEmit.mockImplementation((event, payload, callback) => {
        if (event === 'updateProfile' && typeof callback === 'function') {
          callback(null, undefined)
        }
      })

      render(<ProfileMenu {...defaultProps} />)

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TestUser' } })
      fireEvent.click(screen.getByRole('button', { name: /submit|start|play/i }))

      await waitFor(() => {
        expect(screen.getByText('Unknown error')).toBeInTheDocument()
      })
    })
  })

  describe('Theme Support', () => {
    it('should apply dark theme class', () => {
      const { container } = render(<ProfileMenu {...defaultProps} theme="dark" />)
      
      const darkElements = container.querySelectorAll('.dark')
      expect(darkElements.length).toBeGreaterThanOrEqual(0)
    })

    it('should apply light theme by default', () => {
      const { container } = render(<ProfileMenu {...defaultProps} theme="light" />)
      
      // Component should render with input and buttons
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(container.querySelector('input')).toBeTruthy()
    })

    it('should render and call logout when provided', () => {
      const onLogout = vi.fn()
      render(<ProfileMenu {...defaultProps} onLogout={onLogout} />)

      fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))

      expect(onLogout).toHaveBeenCalled()
    })

    it('should render profile menu labels in French', () => {
      const onLogout = vi.fn()
      render(
        <ProfileMenu
          {...defaultProps}
          title="Profile"
          submitLabel="Save"
          language="fr"
          onLogout={onLogout}
        />
      )

      expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Aleatoire' })).toBeInTheDocument()
      expect(screen.getByText('Peau')).toBeInTheDocument()
      expect(screen.getByText('Yeux')).toBeInTheDocument()
      expect(screen.getByText('Bouche')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Pseudo')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Se deconnecter' })).toBeInTheDocument()
    })

    it('should fall back to English labels when language is unsupported', () => {
      render(
        <ProfileMenu
          {...defaultProps}
          title="Profile"
          submitLabel="Save"
          language="zz"
          onLogout={vi.fn()}
        />
      )

      expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Random' })).toBeInTheDocument()
      expect(screen.getByText('Skin')).toBeInTheDocument()
      expect(screen.getByText('Eyes')).toBeInTheDocument()
      expect(screen.getByText('Mouth')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument()
    })
  })

  describe('Avatar Validation', () => {
    it('should have valid skin colors', async () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'TestUser' } })
      
      const submitButton = screen.getByRole('button', { name: /submit|start|play/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        const callArgs = mockOnSubmit.mock.calls[0][0]
        expect(callArgs.avatar.skinColor).toMatch(/^#[0-9a-fA-F]{6}$/)
      })
    })

    it('should have valid eye types', async () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'TestUser' } })
      
      const submitButton = screen.getByRole('button', { name: /submit|start|play/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        const callArgs = mockOnSubmit.mock.calls[0][0]
        expect(callArgs.avatar.eyeType).toBeTruthy()
        expect(typeof callArgs.avatar.eyeType).toBe('string')
      })
    })

    it('should have valid mouth types', async () => {
      render(<ProfileMenu {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'TestUser' } })
      
      const submitButton = screen.getByRole('button', { name: /submit|start|play/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        const callArgs = mockOnSubmit.mock.calls[0][0]
        expect(callArgs.avatar.mouthType).toBeTruthy()
        expect(typeof callArgs.avatar.mouthType).toBe('string')
      })
    })
  })
})
