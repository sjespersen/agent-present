/**
 * Agent Present for Claude Code — "Don't make me read."
 *
 * Registers a `present` tool Claude uses to answer with a native visual
 * presentation, draws it in place of the tool's row in the transcript, ends
 * the turn so the answer is not repeated in prose, and adds /present: modes,
 * demos, an explorer pane, actions, and /present last, which converts the
 * previous prose answer into a presentation.
 */
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderSurface, ResolveInput } from 'claude-code'

import type { ExplorerView, PresentDocument, PresentMode } from '../types'
import * as P from './present.js'
import type { Action, Segment } from './present.js'

const PLUGIN = 'agent-present'
const TOOL = `mcp__${PLUGIN}__${P.TOOL}`
/** The tool's full name as a matcher (a plugin's own tools are not in the build's tool table). */
const TOOL_MATCH = new RegExp(`^${TOOL}$`)
const PANE = 'agent-present'
const COMMAND = 'present'
/**
 * First line of a /present output row that carries presentations: `Agent Present #3 #4`.
 * The row's text may carry the plugin's name before it (`agent-present: Agent Present #3`).
 */
const OUTPUT_HEAD = /^(?:[\w@.-]+: )?Agent Present((?: #\d+)+)\s*(?:\n|$)/

const mode = atom({ plugin: 'agent-present', key: 'mode' } as const, 'auto')
const last = atom({ plugin: 'agent-present', key: 'last' } as const, null)
const isFresh = atom({ plugin: 'agent-present', key: 'isFresh' } as const, false)
const progress = atom({ plugin: 'agent-present', key: 'progress' } as const, null)
const shown = atom({ plugin: 'agent-present', key: 'shown' } as const, {})
const seq = atom({ plugin: 'agent-present', key: 'seq' } as const, 0)
const view = atom({ plugin: 'agent-present', key: 'view' } as const, 'scan')

const SUBCOMMANDS = 'auto | always | off | demo [name|all] | last | view | raw | act <n> | status'
const MODE_TEXT: Record<PresentMode, string> = {
  auto: 'Agent Present: auto. Claude presents when the answer has structure.',
  always: 'Agent Present: always. Every substantive answer becomes a presentation.',
  off: 'Agent Present: off. Claude answers in plain text.',
}

type Engine = EngineInterface
type Drawable = ResolveInput

// ─── drawing ───────────────────────────────────────────────────────────────

/** Colours by semantic role; theme keys, so presentations follow the person's theme. */
function segmentProps(seg: Segment): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  if (seg.bold) props.bold = true
  if (seg.italic) props.italic = true
  switch (seg.role) {
    case 'good':
      props.color = 'success'
      break
    case 'warning':
      props.color = 'warning'
      break
    case 'critical':
      props.color = 'error'
      break
    case 'info':
      props.color = 'suggestion'
      break
    case 'accent':
      props.color = 'claude'
      break
    case 'muted':
    case 'dim':
    case 'neutral':
      props.dimColor = true
      break
  }
  return props
}

function Lines($: Engine, e: Drawable, lines: Segment[][]) {
  const { Box, Text } = $.ui.resolve(e)
  return (
    <Box flexDirection="column">
      {lines.map(line => (
        <Text wrap="truncate-end">
          {line.length === 0 ? ' ' : line.map(seg => <Text {...segmentProps(seg)}>{seg.text}</Text>)}
        </Text>
      ))}
    </Box>
  )
}

function inlineHints(doc: P.NormalizedDocument): string[] {
  const hints = ['/present view to explore']
  const count = Math.min(9, doc.actions.length)
  if (count) hints.push(count === 1 ? '/present act 1' : `/present act 1-${count}`)
  return hints
}

/** The width a transcript row may draw into: the viewport, less a column of slack. */
function rowWidth(e: { viewport?: { columns: number } }): number {
  return Math.max(30, (e.viewport?.columns ?? 100) - 2)
}

// ─── actions ───────────────────────────────────────────────────────────────

async function openExplorer($: Engine, start?: ExplorerView) {
  if (start) await update($, view, () => start)
  await $.ui.open({ id: PANE, title: 'Agent Present', focus: true, closeOnEscape: true })
}

/**
 * Runs one of a presentation's actions; answers a line saying what happened.
 *
 * `fromCommand`: a prompt cannot be submitted from inside a `command.run` hook (the
 * turn would wait on the hook), so /present act queues it on the clock instead.
 */
async function runAction($: Engine, action: Action, options: { surface?: RenderSurface; fromCommand?: boolean } = {}): Promise<string> {
  switch (action.intent) {
    case 'agent': {
      const text = action.prompt ?? action.label
      const submit = () =>
        void $.prompt.submit({ text }).catch((error: Error) => $.ui.toast(`Could not send "${action.label}": ${error.message}`))
      await $.ui.close({ id: PANE }).catch(() => undefined)
      if (options.fromCommand) $.clock.after(0, submit)
      else submit()
      return `Sent to Claude: ${text}`
    }
    case 'expand':
      await openExplorer($, 'explore')
      return `Opened ${action.target ?? 'the details'} in the explorer.`
    case 'copy': {
      const copied = await $.ui.copy({ text: action.value ?? action.label, surface: options.surface })
      return copied.isCopied ? `Copied ${action.label}.` : `Could not copy (${copied.reason}).`
    }
    case 'open': {
      if (!action.value) return `"${action.label}" has nothing to open.`
      for (const opener of ['open', 'xdg-open']) {
        const ran = await $.process.run([opener, action.value]).catch(() => undefined)
        if (ran && ran.exitCode === 0) return `Opened ${action.value}.`
      }
      return `Could not open ${action.value}.`
    }
    default:
      return `"${action.label}" has no action this host can run.`
  }
}

async function lastDocument($: Engine) {
  const raw = await read($, last)
  return raw ? { raw, doc: P.normalize(raw) } : undefined
}

// ─── /present ──────────────────────────────────────────────────────────────

/** Keeps a command-made presentation and answers its output row's text. */
async function keep($: Engine, docs: PresentDocument[]): Promise<string> {
  const start = (await read($, seq)) + 1
  await update($, seq, n => n + docs.length)
  await update($, shown, all => {
    const next: Record<string, PresentDocument> = { ...all }
    docs.forEach((doc, i) => (next[String(start + i)] = doc))
    // Older presentations fall back to their outline text; keep the store small.
    const keys = Object.keys(next).sort((a, b) => Number(a) - Number(b))
    for (const key of keys.slice(0, Math.max(0, keys.length - 40))) delete next[key]
    return next
  })
  const final = docs.filter(doc => P.normalize(doc).intent !== 'progress')
  if (final.length) {
    await update($, last, () => final[final.length - 1] ?? null)
    await update($, isFresh, () => true)
  }
  const ids = docs.map((_, i) => ` #${start + i}`).join('')
  const outlines = docs.map(doc => P.outline(P.normalize(doc))).join('\n\n')
  return `Agent Present${ids}\n${outlines}`
}

async function setMode($: Engine, next: PresentMode): Promise<string> {
  await update($, mode, () => next)
  $.ui.invalidate('tool.describe')
  return MODE_TEXT[next]
}

/** /present last: one model call (plus one repair) turns the previous prose answer into a presentation. */
async function presentLast($: Engine): Promise<string> {
  const messages = await $.session.messages()
  const answer = [...messages].reverse().find(m => m.role === 'assistant' && m.text.trim() !== '')?.text.trim()
  if (!answer) return 'No answer from Claude to present yet.'

  const model = await $.session.model()
  const ask = async (prompt: string) => {
    const reply = await $.model.complete({ model, system: P.TRANSFORM_SYSTEM, prompt, maxTokens: 8000 })
    if (!reply.isAnswered) throw new Error(`the model call failed (${reply.reason})`)
    return reply.text
  }

  $.ui.status('Agent Present: composing presentation…')
  try {
    const prompt = P.transformPrompt(answer)
    let raw: PresentDocument
    try {
      raw = P.parseReply(await ask(prompt))
    } catch (error) {
      raw = P.parseReply(await ask(`${prompt}\n\nYour previous reply was not valid JSON (${(error as Error).message}). Reply with only the JSON object.`))
    }
    const errors = P.schemaErrors(raw)
    if (errors) {
      try {
        const repaired = P.parseReply(await ask(P.repairPrompt(answer, raw, errors)))
        const left = P.schemaErrors(repaired)
        if (!left || left.split('\n').length < errors.split('\n').length) raw = repaired
      } catch {
        // keep the first attempt: the normalizer is lenient
      }
    }
    const checked = P.check(raw)
    if (!checked.ok) return `Could not present the last answer: ${checked.error}`
    return await keep($, [checked.raw])
  } catch (error) {
    return `Could not present the last answer: ${(error as Error).message}`
  } finally {
    $.ui.status(undefined)
  }
}

async function runCommand($: Engine, args: string): Promise<string> {
  const [sub = 'status', ...rest] = args.trim().split(/\s+/).filter(Boolean)
  switch (sub) {
    case 'status': {
      const current = await read($, mode)
      const doc = await read($, last)
      return `${MODE_TEXT[current]}\n${doc ? '/present view explores the last presentation.' : 'No presentation yet: try /present demo.'}\nUsage: /present ${SUBCOMMANDS}`
    }
    case 'on':
    case 'auto':
      return setMode($, 'auto')
    case 'always':
      return setMode($, 'always')
    case 'off':
      return setMode($, 'off')
    case 'demo': {
      const name = rest[0] ?? 'repo-review'
      const names = name === 'all' ? Object.keys(P.DEMOS) : [name]
      const docs = names.map(n => P.DEMOS[n])
      if (docs.some(d => d === undefined)) return `Unknown demo "${name}". Try: all, ${Object.keys(P.DEMOS).join(', ')}`
      return keep($, docs as PresentDocument[])
    }
    case 'last':
      return presentLast($)
    case 'view':
    case 'explore':
    case 'raw': {
      if (!(await read($, last))) return 'No presentation yet: try /present demo.'
      await openExplorer($, sub === 'raw' ? 'raw' : 'scan')
      return 'Opened the explorer.'
    }
    case 'act': {
      const found = await lastDocument($)
      if (!found) return 'No presentation yet: try /present demo.'
      const n = Number.parseInt(rest[0] ?? '', 10)
      const action = found.doc.actions.find((a, i) => a.id === rest[0] || i === n - 1)
      if (!action) {
        const list = found.doc.actions.map((a, i) => `${i + 1}. ${a.label}`).join('\n')
        return list ? `No such action. The last presentation has:\n${list}` : 'The last presentation has no actions.'
      }
      return runAction($, action, { fromCommand: true })
    }
    default:
      return `Unknown subcommand "${sub}". Usage: /present ${SUBCOMMANDS}`
  }
}

// ─── the module ────────────────────────────────────────────────────────────

export const register: Register = on => {
  /** The final presentation that answered this turn: the turn's next model request is not sent. */
  let answer: PresentDocument | null = null

  on('session.start', async ($, e, next) => {
    await $.tool.register({ name: P.TOOL, description: P.DESCRIPTION, inputSchema: P.presentToolSchema() })
    await $.command.register({
      name: COMMAND,
      description: 'Agent Present: modes, demos, the explorer, actions, and /present last',
      argumentHint: SUBCOMMANDS,
    })
    return next(e)
  })

  // ── what the model is told ──

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const current = await read($, mode)
    if (current === 'off' || !e.tools.includes(TOOL)) return composed
    return { sections: [...composed.sections, { id: PLUGIN, text: P.guidelines(current), scope: 'session' as const }] }
  })

  on('tool.describe', { tool: TOOL_MATCH }, async ($, e, next) => {
    const described = await next(e)
    // Listed in the prompt rather than behind ToolSearch: deciding to present should cost no extra step.
    if ((await read($, mode)) !== 'off') return { ...described, isDeferred: false }
    return { description: `Disabled by the user (/present off). Do not call; answer in plain text.`, isDeferred: true }
  })

  // ── the tool ──

  on('tool.call', { tool: TOOL_MATCH }, async ($, e) => {
    if ((await read($, mode)) === 'off') {
      return { deny: 'Agent Present is off (/present off). Answer in plain text.' }
    }
    const checked = P.check(e)
    if (!checked.ok) return { deny: checked.error }

    if (checked.isProgress) {
      await update($, progress, () => checked.raw)
    } else {
      await update($, progress, () => null)
      // A subagent's presentation is its report to Claude, not the person's answer.
      if (e.agentId === undefined) {
        await update($, last, () => checked.raw)
        await update($, isFresh, () => true)
        answer = checked.raw
      }
    }
    return { result: P.resultText(checked) }
  })

  // The presentation is the answer: end the turn instead of asking the model to write it again.
  // Where nothing draws (`claude -p`), the turn's text answer is the presentation as plain text.
  on('turn.step', async function* ($, e, next) {
    if (answer === null || e.agentId !== undefined) return yield* next(e)
    const doc = answer
    answer = null
    const isHeadless = (await $.session.surfaces()).length === 0
    const text = isHeadless ? P.renderPlainText(doc, { width: 100, depth: 'scan' }) : ''
    if (text) yield { kind: 'text' as const, index: 0, text }
    return { turnId: e.turnId, index: e.index, answer: text, toolUses: [], stopReason: 'end_turn' as const, usage: null }
  })

  on('turn.start', ($, e, next) => {
    answer = null
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    answer = null
    await update($, progress, () => null)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, isFresh, () => false)
    return next(e)
  })

  // ── the transcript ──

  on('ui.render', { component: 'ToolUse', props: { tool: TOOL } }, async ($, e, next) => {
    if (e.props.isErrored || e.props.isInterrupted) return next(e)
    const checked = P.check(e.props.input)
    if (!checked.ok) return next(e)
    const { Text } = $.ui.resolve(e)
    if (checked.isProgress) {
      return <Text dimColor>◐ {checked.doc.title ?? 'progress'} updated</Text>
    }
    const lines = P.draw(checked.raw, { width: rowWidth(e), hints: e.props.isRunning ? ['presenting…'] : inlineHints(checked.doc) })
    return Lines($, e, [[], ...lines])
  })

  // The row above already is the result; the model's copy of it stays out of sight.
  on('ui.render', { component: 'ToolResult', props: { tool: TOOL } }, async ($, e, next) => {
    if (e.props.isErrored) return next(e)
    const { Box } = $.ui.resolve(e)
    return <Box />
  })

  on('ui.render', { component: 'CommandOutput', props: { command: COMMAND } }, async ($, e, next) => {
    const head = OUTPUT_HEAD.exec(e.props.text)
    if (!head || e.props.isErrored) return next(e)
    const all = await read($, shown)
    const docs = (head[1] ?? '').trim().split(' ').map(id => all[id.slice(1)])
    // Presentations from an earlier session are not kept: the outline text stands in.
    if (docs.some(doc => doc === undefined)) return next(e)
    const { Box } = $.ui.resolve(e)
    const width = rowWidth(e)
    return (
      <Box flexDirection="column">
        {docs.map(doc => Lines($, e, [[], ...P.draw(doc, { width, hints: inlineHints(P.normalize(doc)) })]))}
      </Box>
    )
  })

  // ── above the prompt: live progress while working, then the last presentation's actions ──

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const working = await read($, progress)
    if (working && e.props.isWorking) {
      const lines = P.draw(working, { width: e.props.bodyColumns, actions: false })
      return Lines($, e, lines.slice(0, Math.max(3, e.props.maxRows)))
    }
    if (e.props.isWorking || !(await read($, isFresh))) return next(e)
    const found = await lastDocument($)
    if (!found || found.doc.actions.length === 0) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
        <Text dimColor>{found.doc.title ?? 'Presentation'} ·</Text>
        {found.doc.actions.slice(0, 9).map((action, i) => (
          <Button
            key={`act-${i + 1}`}
            label={action.label}
            hotkey={String(i + 1)}
            variant={i === 0 ? 'primary' : undefined}
            onPress={press => void runAction($, action, { surface: press.surface }).then(text => $.ui.toast(text))}
          />
        ))}
        <Button key="explore" label="explore" hotkey="e" onPress={() => void openExplorer($, 'scan')} />
        <Button key="dismiss" label="×" plain role="dismiss" onPress={() => void update($, isFresh, () => false)} />
      </Box>
    )
  })

  // ── the explorer ──

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const found = await lastDocument($)
    if (!found) return <Text dimColor>No presentation yet. Try /present demo.</Text>
    const current = await read($, view)
    const width = Math.max(30, e.props.bodyColumns)
    const tab = (target: ExplorerView, hotkey: string) => (
      <Button
        key={`view-${target}`}
        label={target}
        hotkey={hotkey}
        variant={current === target ? 'primary' : undefined}
        onPress={() => void update($, view, () => target)}
      />
    )
    const body =
      current === 'raw'
        ? P.rawLines(found.raw).map(line => [{ text: line, role: 'muted' as const }])
        : P.draw(found.raw, { width, depth: current, margin: 0, actions: false })
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
          {tab('glance', 'g')}
          {tab('scan', 's')}
          {tab('explore', 'x')}
          {tab('raw', 'r')}
          <Button
            key="copy"
            label="copy"
            hotkey="c"
            onPress={async press => {
              const copied = await $.ui.copy({ text: P.renderPlainText(found.raw, { width: 100, depth: 'explore' }), surface: press.surface })
              $.ui.toast(copied.isCopied ? 'Copied the presentation as text' : `Could not copy (${copied.reason})`)
            }}
          />
          <Button key="close" label="close" hotkey="q" role="dismiss" onPress={() => void $.ui.close({ id: PANE })} />
        </Box>
        {found.doc.actions.length > 0 && (
          <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
            {found.doc.actions.slice(0, 9).map((action, i) => (
              <Button
                key={`act-${i + 1}`}
                label={action.label}
                hotkey={String(i + 1)}
                onPress={press => void runAction($, action, { surface: press.surface }).then(text => $.ui.toast(text))}
              />
            ))}
          </Box>
        )}
        <Text> </Text>
        {Lines($, e, body)}
      </Box>
    )
  })

  on('command.run', { command: COMMAND }, async ($, e) => ({ text: await runCommand($, e.args) }))
}
