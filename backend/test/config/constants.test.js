import { describe, it, expect } from 'vitest'

import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  GIANT_BOARD_WIDTH,
  GIANT_BOARD_HEIGHT,
  PLAYER_MODES,
  SCORE_BY_LINES,
  LINES_PER_LEVEL,
} from '../../src/config/constants.js'

describe('constants', () => {
  it('matches expected board sizes', () => {
    expect(BOARD_WIDTH).toBe(10)
    expect(BOARD_HEIGHT).toBe(20)
    expect(GIANT_BOARD_WIDTH).toBe(15)
    expect(GIANT_BOARD_HEIGHT).toBe(30)
  })

  it('keeps player modes and scoring stable', () => {
    expect(PLAYER_MODES).toEqual({
      SOLO: 'solo',
      MULTI: 'multiplayer',
    })
    expect(SCORE_BY_LINES).toEqual({
      1: 40,
      2: 100,
      3: 300,
      4: 1200,
    })
    expect(LINES_PER_LEVEL).toBe(10)
  })
})
