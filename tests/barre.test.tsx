import { expect, test } from 'claude-code/testing'

const MAINTENANT = Date.parse('2026-10-29T18:00:00Z')

const BANDEAU = {
  plugin: 'barre-limites',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 100 },
} as const

test('le bandeau affiche les limites et le delta', async ($, on) => {
  on('clock.now', () => ({ value: MAINTENANT }))
  on('session.usage', () => ({
    value: {
      startedAt: MAINTENANT - 72 * 60000,
      context: { window: 200000, percent: 24 },
      rateLimits: [],
    },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'limites' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.measure({
    context: { window: 200000, percent: 24 },
    // 5 h : reset dans 2h30 → 50 % du temps écoulé, 42 % consommé → Δ-8 %
    // 7 j : reset dans 3,5 j → 50 % écoulé, 61 % consommé → Δ+11 %
    rateLimits: [
      { kind: 'five_hour', percentUsed: 42, resetsAt: new Date(MAINTENANT + 2.5 * 3600000).toISOString() },
      { kind: 'seven_day', percentUsed: 61, resetsAt: new Date(MAINTENANT + 3.5 * 86400000).toISOString() },
    ],
    changed: ['context', 'rateLimits'],
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BANDEAU, surface })
    const ligne = await ui.find({ type: 'Text', text: /session/ })
    expect(ligne?.text).toBe('session 1h12  ·  ctx 24%  ·  5h 42% Δ-8% ↻2h30  ·  7j 61% Δ+11% ↻3j12h')
    await ui.unmount()
  }
})

test('le panneau Limites détaille chaque fenêtre', async ($, on) => {
  on('clock.now', () => ({ value: MAINTENANT }))
  on('session.usage', () => ({
    value: {
      startedAt: MAINTENANT - 72 * 60000,
      context: { window: 200000, percent: 24 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 42, resetsAt: new Date(MAINTENANT + 2.5 * 3600000).toISOString() },
      ],
    },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'limites' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({
    plugin: 'barre-limites',
    component: 'Pane',
    requestId: 'barre-limites',
    surface: 'desktop',
    props: { title: 'Limites', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
  })
  const ligne = await ui.find({ type: 'Text', text: /Limite 5 h/ })
  expect(ligne?.text).toBe('Limite 5 h  ████████░░░░░░░░░░░░  42%')
  const detail = await ui.find({ type: 'Text', text: /dans le rythme/ })
  expect(detail?.text).toBe('Δ -8% (dans le rythme)   reset dans 2h30')
  await ui.unmount()
})
