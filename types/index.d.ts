export type Fenetre = { kind: string; percentUsed: number; resetsAt?: string }

export type Mesure = {
  startedAt: number
  contextPercent?: number
  fenetres: Fenetre[]
}

declare module 'claude-code' {
  interface PluginState {
    'barre-limites': { mesure: Mesure | null }
  }
}
