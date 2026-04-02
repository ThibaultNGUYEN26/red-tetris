import { afterEach, describe, it, expect } from 'vitest'

import { createGame, getGame, removeGame } from '../../src/game/gameManager.js'

describe('gameManager', () => {
  afterEach(() => {
    removeGame('room-1')
    removeGame('solo-room')
  })

  it('creates and retrieves a multiplayer game', () => {
    const game = createGame('room-1', ['Titi', 'Riri'], 'classic', 'Titi')

    expect(getGame('room-1')).toBe(game)
    expect(game.mode_player).toBe('multi')
    expect(game.players.map((player) => player.username)).toEqual(['Titi', 'Riri'])
    expect(game.hostUsername).toBe('Titi')
  })

  it('reuses an existing game for the same room id', () => {
    const first = createGame('room-1', ['Titi', 'Riri'], 'classic', 'Titi')
    const second = createGame('room-1', ['Other'], 'classic', 'Other')

    expect(second).toBe(first)
  })

  it('creates solo mode when there is only one player', () => {
    const game = createGame('solo-room', ['Titi'], 'classic', 'Titi')

    expect(game.mode_player).toBe('solo')
  })

  it('removes a stored game', () => {
    createGame('room-1', ['Titi', 'Riri'], 'classic', 'Titi')

    removeGame('room-1')

    expect(getGame('room-1')).toBeUndefined()
  })
})
