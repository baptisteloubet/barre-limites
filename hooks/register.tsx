import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Fenetre, Mesure } from '../types'

// Session, contexte, limite 5 h, limite 7 j, et l'écart au rythme (Δ).
// Δ = % consommé − % du temps écoulé dans la fenêtre.
// Positif : tu consommes plus vite que le rythme qui tiendrait jusqu'au reset.
// Affiché à trois endroits : un panneau « Limites », la ligne de statut et le bandeau au-dessus de la saisie.

const PANNEAU = 'barre-limites'
const mesure = atom({ plugin: 'barre-limites', key: 'mesure' } as const, null)

const FENETRES: Record<string, { label: string; dureeMs: number }> = {
  five_hour: { label: '5h', dureeMs: 5 * 3600 * 1000 },
  seven_day: { label: '7j', dureeMs: 7 * 24 * 3600 * 1000 },
}

const duree = (ms: number): string => {
  const min = Math.max(0, Math.floor(ms / 60000))
  const j = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60

  if (j > 0) return `${j}j${h}h`
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`

  return `${m}min`
}

// Barre texte : █ consommé, ░ restant. Lisible sur tous les écrans (terminal, app, mobile).
const LARGEUR_BARRE = 20
const barre = (pct: number): string => {
  const plein = Math.round((Math.min(100, Math.max(0, pct)) / 100) * LARGEUR_BARRE)

  return '█'.repeat(plein) + '░'.repeat(LARGEUR_BARRE - plein)
}

const couleurUsage =(p: number) => (p >= 90 ? 'error' : p >= 70 ? 'warning' : 'success')
const couleurDelta = (d: number) => (d > 10 ? 'error' : d > 0 ? 'warning' : 'success')

type Calcul = { label: string; pct: number; delta: number | null; reste: number | null }

const calculer = (m: Mesure, maintenant: number): Calcul[] =>
  ['five_hour', 'seven_day']
    .map(k => m.fenetres.find(f => f.kind === k))
    .filter((f): f is Fenetre => f !== undefined)
    .map(f => {
      const def = FENETRES[f.kind]!
      const reset = f.resetsAt ? Date.parse(f.resetsAt) : NaN
      const reste = Number.isNaN(reset) ? null : reset - maintenant
      const ecoule =
        reste === null ? null : Math.min(100, Math.max(0, ((def.dureeMs - reste) / def.dureeMs) * 100))

      return { label: def.label, pct: f.percentUsed, delta: ecoule === null ? null : f.percentUsed - ecoule, reste }
    })

const signe = (d: number) => `${d > 0 ? '+' : ''}${Math.round(d)}%`

const texteStatut = (m: Mesure, maintenant: number): string =>
  calculer(m, maintenant)
    .map(c => `${c.label} ${Math.round(c.pct)}%${c.delta === null ? '' : ` Δ${signe(c.delta)}`}`)
    .join(' · ') || `session ${duree(maintenant - m.startedAt)}`

const lireUsage = async ($: EngineInterface): Promise<Mesure> => {
  const u = await $.session.usage()

  return {
    startedAt: u.startedAt,
    contextPercent: u.context.percent,
    fenetres: u.rateLimits.map(f => ({ kind: f.kind, percentUsed: f.percentUsed, resetsAt: f.resetsAt })),
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.command.register({ name: 'limites', description: 'Ouvre le panneau des limites (5 h, 7 jours, avance/retard)' })
    const m = await lireUsage($)
    await update($, mesure, () => m)
    $.ui.status(texteStatut(m, await $.clock.now()))
    void $.ui.open({ id: PANNEAU, title: 'Limites' })

    return r
  })

  on('command.run', { command: 'limites' }, async $ => {
    await $.ui.open({ id: PANNEAU, title: 'Limites' })

    return { text: 'Panneau des limites ouvert.' }
  })

  on('session.measure', async ($, e, next) => {
    const avant = await read($, mesure)
    const m: Mesure = {
      startedAt: avant?.startedAt ?? (await $.session.usage()).startedAt,
      contextPercent: e.context.percent,
      fenetres: e.rateLimits.map(f => ({ kind: f.kind, percentUsed: f.percentUsed, resetsAt: f.resetsAt })),
    }
    await update($, mesure, () => m)
    $.ui.status(texteStatut(m, await $.clock.now()))

    return next(e)
  })

  // Panneau latéral : une ligne par indicateur.
  on('ui.render', { component: 'Pane', requestId: PANNEAU }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const m = await read($, mesure)

    if (m === null) {
      return <Text dimColor>En attente de la première mesure…</Text>
    }

    const maintenant = await $.clock.now()
    const calculs = calculer(m, maintenant)

    return (
      <Box flexDirection="column">
        <Text>
          <Text dimColor>Session </Text>
          {duree(maintenant - m.startedAt)}
          {m.contextPercent !== undefined ? <Text dimColor>{'   ·   contexte '}{m.contextPercent}%</Text> : null}
        </Text>
        {calculs.length === 0 ? (
          <Text dimColor>Limites : affichées après la prochaine réponse de Claude.</Text>
        ) : null}
        {calculs.map(c => (
          <Box flexDirection="column" marginTop={1}>
            <Text>
              <Text weight="semibold">{c.label === '5h' ? 'Limite 5 h  ' : 'Limite 7 j  '}</Text>
              <Text color={couleurUsage(c.pct)}>{barre(c.pct)}</Text>
              <Text color={couleurUsage(c.pct)} weight="semibold">{'  '}{Math.round(c.pct)}%</Text>
            </Text>
            <Text>
              {c.delta !== null ? (
                <Text color={couleurDelta(c.delta)}>
                  {'Δ '}
                  {signe(c.delta)} {c.delta > 0 ? '(en avance sur le rythme)' : '(dans le rythme)'}
                </Text>
              ) : null}
              {c.reste !== null && c.reste > 0 ? <Text dimColor>{'   reset dans '}{duree(c.reste)}</Text> : null}
            </Text>
          </Box>
        ))}
      </Box>
    )
  })

  // Bandeau au-dessus de la saisie (terminal surtout).
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const m = await read($, mesure)

    if (e.props.hasSurvey || m === null) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const maintenant = await $.clock.now()

    return (
      <Box>
        <Text>
          <Text dimColor>session </Text>
          <Text>{duree(maintenant - m.startedAt)}</Text>
          {m.contextPercent !== undefined ? (
            <Text>
              {'  ·  '}
              <Text dimColor>ctx </Text>
              {m.contextPercent}%
            </Text>
          ) : null}
          {calculer(m, maintenant).map(c => (
            <Text>
              {'  ·  '}
              <Text dimColor>{c.label} </Text>
              <Text color={couleurUsage(c.pct)} weight="semibold">{Math.round(c.pct)}%</Text>
              {c.delta !== null ? <Text color={couleurDelta(c.delta)}> Δ{signe(c.delta)}</Text> : null}
              {c.reste !== null && c.reste > 0 ? <Text dimColor> ↻{duree(c.reste)}</Text> : null}
            </Text>
          ))}
        </Text>
      </Box>
    )
  })
}
