import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()

vi.mock('../../src/config/db.js', () => ({
  pool: {
    query: mockQuery,
  },
}))

describe('account deletion service', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('soft deletes an active account and removes the user from rooms', async () => {
    const deletedAccount = {
      username: 'Titi',
      deleted_at: new Date().toISOString(),
      delete_after: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    }
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [deletedAccount] })
      .mockResolvedValueOnce({ rowCount: 2, rows: [] })

    const {
      ACCOUNT_RESTORE_DAYS,
      softDeleteAccount,
    } = await import('../../src/services/accountDeletion.service.js')

    const result = await softDeleteAccount('Titi')

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SET deleted_at = NOW()'),
      ['Titi', ACCOUNT_RESTORE_DAYS]
    )
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM rooms'),
      ['Titi']
    )
    expect(result).toEqual({ rowCount: 1, rows: [deletedAccount] })
  })

  it('does not clear rooms when soft delete finds no active account', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })

    const { softDeleteAccount } = await import('../../src/services/accountDeletion.service.js')

    const result = await softDeleteAccount('Missing')

    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ rowCount: 0, rows: [] })
  })

  it('restores a deleted account that is still inside the restore window', async () => {
    const restoredAccount = {
      id: 1,
      username: 'Titi',
      email: 'titi@example.com',
      avatar: { eyeType: 'happy' },
    }
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [restoredAccount] })

    const { restoreDeletedAccount } = await import('../../src/services/accountDeletion.service.js')

    const result = await restoreDeletedAccount('Titi')

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SET deleted_at = NULL'),
      ['Titi']
    )
    expect(result).toEqual({ rowCount: 1, rows: [restoredAccount] })
  })

  it('returns zero when there are no expired deleted accounts to purge', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })

    const { purgeExpiredDeletedAccounts } = await import('../../src/services/accountDeletion.service.js')

    await expect(purgeExpiredDeletedAccounts()).resolves.toBe(0)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('purges expired deleted accounts and related records', async () => {
    const usernames = ['Titi', 'Riri']
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 2,
        rows: usernames.map((username) => ({ username })),
      })
      .mockResolvedValue({ rowCount: 1, rows: [] })

    const { purgeExpiredDeletedAccounts } = await import('../../src/services/accountDeletion.service.js')

    await expect(purgeExpiredDeletedAccounts()).resolves.toBe(2)

    expect(mockQuery).toHaveBeenCalledTimes(6)
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM rooms'),
      [usernames]
    )
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('DELETE FROM solo_scores'),
      [usernames]
    )
    expect(mockQuery).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('DELETE FROM multiplayer_scores'),
      [usernames]
    )
    expect(mockQuery).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('DELETE FROM coop_scores'),
      [usernames]
    )
    expect(mockQuery).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining('DELETE FROM users'),
      [usernames]
    )
  })
})
