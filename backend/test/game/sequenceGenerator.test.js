import { describe, it, expect } from 'vitest'

import SequenceGenerator from '../../src/game/sequenceGenerator.js'

describe('sequence generator', () => {
  it('returns a full 7-bag before refilling', () => {
    const generator = new SequenceGenerator()

    const firstBag = Array.from({ length: 7 }, () => generator.next()).sort()

    expect(firstBag).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z'])
  })

  it('refills after the bag is exhausted', () => {
    const generator = new SequenceGenerator()

    Array.from({ length: 7 }, () => generator.next())
    const nextPiece = generator.next()

    expect(['I', 'J', 'L', 'O', 'S', 'T', 'Z']).toContain(nextPiece)
    expect(generator.queue.length).toBe(6)
  })
})
