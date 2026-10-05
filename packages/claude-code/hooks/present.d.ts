// Types of the generated bundle present.js (built from src/lib.ts by build.mjs).
export type Depth = 'glance' | 'scan' | 'explore'
export type Role = 'text' | 'strong' | 'muted' | 'dim' | 'accent' | 'good' | 'warning' | 'critical' | 'info' | 'neutral'
export type Segment = { text: string; role?: Role; bold?: boolean; italic?: boolean }
export type Action = {
  id: string
  label: string
  intent: 'agent' | 'expand' | 'open' | 'copy' | string
  prompt?: string
  target?: string
  value?: string
}
export type NormalizedDocument = {
  title?: string
  intent?: string
  takeaway?: { text: string; status?: string }
  blocks: { id: string; type: string; priority: string }[]
  actions: Action[]
}
export type Checked =
  | { ok: true; raw: { [key: string]: unknown }; doc: NormalizedDocument; warnings: string[]; isProgress: boolean }
  | { ok: false; error: string }

export const TOOL: string
export const DESCRIPTION: string
export const DEMOS: { [name: string]: { [key: string]: unknown } }
export const TRANSFORM_SYSTEM: string
export function guidelines(mode: 'auto' | 'always'): string
export function check(input: unknown): Checked
export function resultText(checked: Extract<Checked, { ok: true }>): string
export function presentToolSchema(): { [key: string]: unknown }
export function normalize(input: unknown): NormalizedDocument
export function outline(doc: NormalizedDocument): string
export function draw(
  input: unknown,
  options: { width: number; depth?: Depth; hints?: string[]; margin?: number; header?: boolean; actions?: boolean },
): Segment[][]
export function rawLines(raw: unknown): string[]
export function renderPlainText(input: unknown, options?: { width?: number; depth?: Depth }): string
export function transformPrompt(answer: string): string
export function repairPrompt(answer: string, raw: unknown, errors: string): string
export function parseReply(reply: string): { [key: string]: unknown }
export function schemaErrors(raw: unknown): string | undefined
