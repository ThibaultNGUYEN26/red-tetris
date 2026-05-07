import { afterEach, describe, expect, it, vi } from 'vitest'
import pg from 'pg'

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
  const originalDatabaseUrl = process.env.DATABASE_URL
  const originalDbSsl = process.env.DB_SSL

  afterEach(() => {
    mockQuery.mockReset()
    mockReaddir.mockReset()
    mockReadFile.mockReset()
    pg.Pool.mockClear()
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = originalDatabaseUrl
    if (originalDbSsl === undefined) delete process.env.DB_SSL
    else process.env.DB_SSL = originalDbSsl
    vi.resetModules()
  })

  it('configures the pool from DATABASE_URL without SSL by default', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/red'
    delete process.env.DB_SSL

    await import('../../src/config/db.js')

    expect(pg.Pool).toHaveBeenCalledWith({
      connectionString: 'postgres://user:pass@localhost:5432/red',
      ssl: undefined,
    })
  })

  it('enables SSL for DATABASE_URL connections when requested', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/red'
    process.env.DB_SSL = 'true'

    await import('../../src/config/db.js')

    expect(pg.Pool).toHaveBeenCalledWith({
      connectionString: 'postgres://user:pass@localhost:5432/red',
      ssl: { rejectUnauthorized: false },
    })
  })

  it('runs unapplied SQL migrations and records them', async () => {
    delete process.env.DATABASE_URL
    delete process.env.DB_SSL
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
    delete process.env.DATABASE_URL
    delete process.env.DB_SSL
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
