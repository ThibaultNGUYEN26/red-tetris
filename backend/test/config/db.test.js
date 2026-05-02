import { afterEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()
const mockReaddir = vi.fn()
const mockReadFile = vi.fn()

vi.mock('pg', () => ({
  default: {
    Pool: vi.fn(function Pool() {
      return {
        query: mockQuery,
      }
    }),
  },
}))

vi.mock('fs/promises', () => ({
  default: {
    readdir: mockReaddir,
    readFile: mockReadFile,
  },
}))

describe('database migrations', () => {
  afterEach(() => {
    mockQuery.mockReset()
    mockReaddir.mockReset()
    mockReadFile.mockReset()
    vi.resetModules()
  })

  it('runs unapplied SQL migrations and records them', async () => {
    mockReaddir.mockResolvedValue(['002_second.sql', 'notes.txt', '001_first.sql'])
    mockReadFile
      .mockResolvedValueOnce('SELECT 1;')
      .mockResolvedValueOnce('SELECT 2;')
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1 })

    const { ensureSchema } = await import('../../src/config/db.js')
    await ensureSchema()

    expect(mockReadFile).toHaveBeenCalledTimes(1)
    expect(mockReadFile.mock.calls[0][0]).toContain('001_first.sql')
    expect(mockQuery).toHaveBeenCalledWith('BEGIN')
    expect(mockQuery).toHaveBeenCalledWith('SELECT 1;')
    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO schema_migrations (name) VALUES ($1)',
      ['001_first.sql']
    )
    expect(mockQuery).toHaveBeenCalledWith('COMMIT')
  })

  it('rolls back and rethrows when a migration fails', async () => {
    const error = new Error('migration failed')
    mockReaddir.mockResolvedValue(['001_first.sql'])
    mockReadFile.mockResolvedValue('SELECT broken;')
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({})

    const { runMigrations } = await import('../../src/config/db.js')
    await expect(runMigrations()).rejects.toThrow('migration failed')

    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK')
  })
})
