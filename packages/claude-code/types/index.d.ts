/** How eagerly Claude presents: `auto` when structure helps, `always`, or `off`. */
export type PresentMode = 'auto' | 'always' | 'off'

/** How much of a presentation the explorer shows; `raw` is the Present JSON. */
export type ExplorerView = 'glance' | 'scan' | 'explore' | 'raw'

/** A Present document as the model or a command produced it (JSON). */
export type PresentDocument = { [key: string]: unknown }

declare module 'claude-code' {
  interface PluginState {
    'agent-present': {
      mode: PresentMode
      /** The latest final presentation: what the explorer, the band and /present act use. */
      last: PresentDocument | null
      /** Whether `last` arrived after the person's latest prompt (the band offers its actions). */
      isFresh: boolean
      /** The live progress presentation while a turn works, else null. */
      progress: PresentDocument | null
      /** Presentations made by /present demo and /present last, by number. */
      shown: { [n: string]: PresentDocument }
      seq: number
      view: ExplorerView
    }
  }
}
