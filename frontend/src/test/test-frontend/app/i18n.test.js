import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LANGUAGE,
  getPlayerStatsTranslation,
  getTranslation,
  isSupportedLanguage,
} from '../../../i18n'

describe('i18n helpers', () => {
  it('falls back to the default language for unsupported languages', () => {
    expect(DEFAULT_LANGUAGE).toBe('en')
    expect(isSupportedLanguage('zz')).toBe(false)
    expect(getTranslation('zz')).toBe(getTranslation(DEFAULT_LANGUAGE))
    expect(getPlayerStatsTranslation('zz')).toBe(getTranslation(DEFAULT_LANGUAGE).playerStats)
  })

  it('exposes dynamic Spanish information labels', () => {
    const labels = getTranslation('es').infoPage.labels

    expect(labels.deleteConfirm('Titi')).toBe(
      'Eliminar la cuenta de Red Tetris "Titi" y sus puntuaciones? Esta accion no se puede deshacer.'
    )
    expect(labels.showTutorialSlide('Rotar')).toBe('Mostrar Rotar')
  })

  it('exposes dynamic Italian information labels', () => {
    const labels = getTranslation('it').infoPage.labels

    expect(labels.deleteConfirm('Titi')).toBe(
      'Delete the Red Tetris account "Titi" and its scores? This cannot be undone.'
    )
    expect(labels.showTutorialSlide('Ruota')).toBe('Show Ruota')
  })
})
