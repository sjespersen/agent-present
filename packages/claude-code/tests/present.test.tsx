import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const PLUGIN = 'agent-present'
const TOOL = 'mcp__agent-present__present'
const SURFACES = ['terminal', 'desktop'] as const

const DOC = {
  title: 'Release',
  subtitle: 'v2.8.0',
  intent: 'decision',
  takeaway: { status: 'warning', text: "Don't ship yet", detail: '2 blockers remain' },
  blocks: [
    {
      type: 'distribution',
      title: 'Tests',
      whole: true,
      items: [
        { label: 'pass', value: 418, status: 'good' },
        { label: 'fail', value: 11, status: 'critical' },
      ],
    },
  ],
  actions: [
    { id: 'fix', label: 'Fix migration', intent: 'agent', prompt: 'Fix the users migration.' },
    { id: 'tag', label: 'Copy tag', intent: 'copy', value: 'v2.8.0' },
  ],
}

const PROGRESS = {
  title: 'Migrating',
  intent: 'progress',
  blocks: [{ type: 'progress', items: [{ label: 'tables', value: 3, total: 8, state: 'running' }] }],
}

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

const toolUse = (input: unknown, extra: Partial<{ isErrored: boolean; isRunning: boolean }> = {}) => ({
  component: 'ToolUse' as const,
  requestId: 'tu-1',
  props: { tool_use_id: 'tu-1', tool: TOOL, input, isRunning: false, isErrored: false, isInterrupted: false, ...extra },
})

const band = (isWorking: boolean) => ({
  component: 'AbovePrompt' as const,
  props: { hasSurvey: false, isWorking, maxRows: 12, bodyColumns: 100, scroll: { offset: 0, bodyRows: 12 }, view: {} },
})

const pane = {
  component: 'Pane' as const,
  requestId: 'agent-present',
  props: { title: 'Agent Present', isFocused: true, bodyColumns: 100, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 40 }, view: {} },
}

const present = ($: Engine, input: object = DOC, extra: object = {}) => $.tool.call({ tool: TOOL, ...input, ...extra } as never)
const command = async ($: Engine, args: string) => (await $.command.run({ command: 'present', args } as never)).text ?? ''

/**
 * What the engine would answer beneath the plugin. Registered first in every test:
 * hooks beneath the plugins must be in place before the test's first call on `$`.
 */
function engine(on: any, options: { surfaces?: string[] } = {}) {
  on('session.surfaces', () => ({ value: options.surfaces ?? ['terminal'] }))
  const log = { toasts: [] as string[], sent: [] as string[], copied: [] as string[], opened: [] as any[], closed: 0 }
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine draws its own</Text>
  })
  on('ui.toast', (_$: unknown, e: { text: string }) => {
    log.toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.status', () => ({ value: undefined }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.open', (_$: unknown, e: unknown) => {
    log.opened.push(e)
    return { value: { isPlaced: true } }
  })
  on('ui.close', () => {
    log.closed++
    return { value: undefined }
  })
  on('ui.copy', (_$: unknown, e: { text: string }) => {
    log.copied.push(e.text)
    return { value: { isCopied: true } }
  })
  on('prompt.submit', (_$: unknown, e: { text: string }) => {
    log.sent.push(e.text)
    return { text: e.text }
  })
  return log
}

/** The explorer draws the last presentation: what /present view and /present act would use. */
async function lastShown($: Engine, text: RegExp): Promise<boolean> {
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...pane })
  const found = (await ui.find({ text })) !== undefined
  await ui.unmount()
  return found
}

/** The band offers the actions of a presentation that arrived since the last prompt. */
async function bandOffers($: Engine): Promise<boolean> {
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...band(false) })
  const found = (await ui.find({ key: 'act-1' })) !== undefined
  await ui.unmount()
  return found
}

/** Answers the engine's model request for each step a test raises, counting them. */
function modelBeneath(on: any) {
  const calls: number[] = []
  on('turn.step', async function* (_$: unknown, e: { turnId: string; index: number }) {
    calls.push(e.index)
    yield { kind: 'text', index: 0, text: 'prose' }
    return { turnId: e.turnId, index: e.index, answer: 'prose', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  return calls
}

async function step($: Engine, index: number, agentId?: string) {
  const stream = $.turn.step({ turnId: 't-1', index, model: 'claude-opus-5-5', messageCount: 3, ...(agentId ? { agentId } : {}) })
  const chunks: unknown[] = []
  for (;;) {
    const next = await stream.next()
    if (next.done) return { chunks, result: next.value }
    chunks.push(next.value)
  }
}

const compose = async ($: Engine, tools = [TOOL]) =>
  (await $.prompt.compose({ model: 'm', promptModel: 'm', surfaces: ['terminal'], tools, outputStyle: null, traits: [] })).sections
const baseSections = (on: any) => on('prompt.compose', () => ({ sections: [{ id: 'base', text: 'You are Claude.', scope: 'shared' }] }))

// ─── the tool ────────────────────────────────────────────────────────────────

describe('the present tool', () => {
  test('a valid document is presented and its outline goes back to the model', async ($, on) => {
    engine(on)
    const ran = await present($)
    expect(ran.deny).toBeUndefined()
    expect(String(ran.result)).toContain('Presented to the user')
    expect(String(ran.result)).toContain("Takeaway [warning]: Don't ship yet")
    expect(String(ran.result)).toContain('Actions: Fix migration')
    expect(await lastShown($, /DON'T SHIP YET/)).toBe(true)
    expect(await bandOffers($)).toBe(true)
  })

  test('an empty document is refused with the reason', async ($, on) => {
    engine(on)
    const ran = await present($, { title: 'Nothing', blocks: [] })
    expect(ran.deny).toContain('Nothing to present')
    expect(await lastShown($, /No presentation yet/)).toBe(true)
  })

  test('sloppy agent output is repaired, and the repair is reported to the model', async ($, on) => {
    engine(on)
    const ran = await present($, {
      takeaway: { text: 'Mostly fine', status: 'ok' },
      blocks: [{ type: 'metric', label: 'coverage', value: '87%' }, { type: 'sparkle', text: 'unknown block' }],
    })
    expect(ran.deny).toBeUndefined()
    expect(String(ran.result)).toContain('Renderer notes')
    expect(await lastShown($, /MOSTLY FINE/)).toBe(true)
  })

  test('progress shows live status above the prompt and keeps the turn going', async ($, on) => {
    engine(on)
    const ran = await present($, PROGRESS)
    expect(String(ran.result)).toContain('Progress shown to the user')
    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: PLUGIN, surface, ...band(true) })
      expect(await ui.find({ text: /MIGRATING/ })).toBeDefined()
      await ui.unmount()
    }
    expect(await lastShown($, /No presentation yet/)).toBe(true)
    // The final presentation replaces the live status.
    await present($)
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...band(true) })
    expect(await ui.find({ text: /MIGRATING/ })).toBeUndefined()
    await ui.unmount()
  })

  test('the live status clears when the turn completes', async ($, on) => {
    engine(on)
    on('turn.complete', () => ({ text: '' }))
    await present($, PROGRESS)
    await $.turn.complete({ turnId: 't-1', reason: 'completed' } as never)
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...band(true) })
    expect(await ui.find({ text: /MIGRATING/ })).toBeUndefined()
    await ui.unmount()
  })

  test('a subagent presentation reports to Claude without becoming the answer', async ($, on) => {
    engine(on)
    const ran = await present($, DOC, { agentId: 'sub-1' })
    expect(String(ran.result)).toContain('Presented')
    expect(await lastShown($, /No presentation yet/)).toBe(true)
  })
})

// ─── ending the turn ─────────────────────────────────────────────────────────

describe('a presentation is the answer', () => {
  test('the model request after a final presentation is not sent', async ($, on) => {
    engine(on)
    const sent = modelBeneath(on)
    await present($)
    const ended = await step($, 1)
    expect(ended.result).toMatchObject({ stopReason: 'end_turn', answer: '', toolUses: [] })
    expect(ended.chunks).toHaveLength(0)
    expect(sent).toHaveLength(0)
    // Only that one request: the next goes to the model.
    await step($, 2)
    expect(sent).toEqual([2])
  })

  test('headless, the skipped request answers with the presentation as plain text', async ($, on) => {
    engine(on, { surfaces: [] })
    const sent = modelBeneath(on)
    await present($)
    const ended = await step($, 1)
    expect(sent).toHaveLength(0)
    expect(ended.chunks).toEqual([expect.objectContaining({ kind: 'text', index: 0 })])
    const answer = String((ended.result as { answer: string }).answer)
    expect(answer).toContain("DON'T SHIP YET")
    expect(answer).not.toMatch(/\x1b/)
    expect(answer.split('\n').every(line => [...line].length <= 100)).toBe(true)
  })

  test('progress and subagent presentations do not end the turn', async ($, on) => {
    engine(on)
    const sent = modelBeneath(on)
    await present($, PROGRESS)
    await step($, 1)
    await present($, DOC, { agentId: 'sub-1' })
    await step($, 2)
    expect(sent).toEqual([1, 2])
  })

  test("a subagent's own request is never the one skipped", async ($, on) => {
    engine(on)
    const sent = modelBeneath(on)
    await present($)
    await step($, 1, 'sub-1')
    expect(sent).toEqual([1])
    await step($, 2)
    expect(sent).toEqual([1])
  })

  test('a refused call does not end the turn', async ($, on) => {
    engine(on)
    const sent = modelBeneath(on)
    await present($, { blocks: [] })
    await step($, 1)
    expect(sent).toEqual([1])
  })

  test('a new turn forgets an unspent end', async ($, on) => {
    engine(on)
    on('turn.start', () => ({ turnId: 't-2' }))
    const sent = modelBeneath(on)
    await present($)
    await $.turn.start({} as never)
    await step($, 1)
    expect(sent).toEqual([1])
  })
})

// ─── modes and the system prompt ────────────────────────────────────────────

describe('modes', () => {
  test('auto adds the presentation guidelines after the engine sections', async ($, on) => {
    engine(on)
    baseSections(on)
    const sections = await compose($)
    expect(sections.map(s => s.id)).toEqual(['base', PLUGIN])
    expect(sections[1]?.scope).toBe('session')
    expect(sections[1]?.text).toContain('A present call is the answer')
    expect(sections[1]?.text).not.toContain('ALWAYS mode')
  })

  test('always asks for every substantive answer', async ($, on) => {
    engine(on)
    baseSections(on)
    expect(await command($, 'always')).toContain('always')
    expect((await compose($))[1]?.text).toContain('ALWAYS mode')
  })

  test('no guidelines where the tool is not offered', async ($, on) => {
    engine(on)
    baseSections(on)
    expect((await compose($, ['Bash'])).map(s => s.id)).toEqual(['base'])
  })

  test('off removes the guidelines, defers the tool and refuses calls; on restores them', async ($, on) => {
    engine(on)
    baseSections(on)
    on('tool.describe', () => ({ description: 'original' }))
    const describe = () => $.tool.describe({ tool: TOOL, description: 'original', provider: { kind: 'plugin', name: PLUGIN } } as never)
    // On, the tool is listed in the prompt rather than behind ToolSearch.
    expect((await describe()).isDeferred).toBe(false)

    expect(await command($, 'off')).toContain('off')
    expect((await compose($)).map(s => s.id)).toEqual(['base'])
    expect((await describe()).isDeferred).toBe(true)
    expect((await present($)).deny).toContain('off')
    expect(await command($, '')).toContain('Agent Present: off')

    expect(await command($, 'on')).toContain('auto')
    expect((await compose($)).map(s => s.id)).toEqual(['base', PLUGIN])
    expect((await describe()).description).toBe('original')
    expect((await present($)).deny).toBeUndefined()
  })

  test('status and unknown subcommands explain the usage', async ($, on) => {
    engine(on)
    expect(await command($, '')).toContain('Agent Present: auto')
    expect(await command($, '')).toContain('/present demo')
    expect(await command($, 'bogus')).toContain('Unknown subcommand "bogus"')
  })
})

// ─── drawing ────────────────────────────────────────────────────────────────

describe('the transcript', () => {
  test('the tool row draws the presentation on every surface', async ($, on) => {
    engine(on)
    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: PLUGIN, surface, ...toolUse(DOC) })
      expect(await ui.find({ text: /DON'T SHIP YET/ })).toBeDefined()
      expect(await ui.find({ text: /2 blockers remain/ })).toBeDefined()
      expect(await ui.find({ text: /fix migration/ })).toBeDefined()
      expect(await ui.find({ text: /\/present view to explore/ })).toBeDefined()
      await ui.unmount()
    }
  })

  test('statuses are drawn in theme colours', async ($, on) => {
    engine(on)
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...toolUse(DOC) })
    const runs = await ui.findAll({ type: 'Text' })
    expect(runs.find(r => r.text === "DON'T SHIP YET")?.props).toMatchObject({ color: 'warning', bold: true })
    expect(runs.some(r => r.props.color === 'success')).toBe(true)
    expect(runs.some(r => r.props.color === 'error')).toBe(true)
    await ui.unmount()
  })

  test('the drawing fits the terminal width', async ($, on) => {
    engine(on)
    for (const columns of [40, 60, 100, 160]) {
      const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', viewport: { columns, rows: 40 }, ...toolUse(DOC) })
      const lines = (await ui.findAll({ type: 'Text' })).filter(l => l.props.wrap === 'truncate-end')
      expect(lines.length).toBeGreaterThan(5)
      expect(Math.max(...lines.map(l => [...l.text].length))).toBeLessThanOrEqual(columns)
      await ui.unmount()
    }
  })

  test('a running call says it is presenting', async ($, on) => {
    engine(on)
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...toolUse(DOC, { isRunning: true }) })
    expect(await ui.find({ text: /presenting…/ })).toBeDefined()
    await ui.unmount()
  })

  test('an errored call is left to the engine', async ($, on) => {
    engine(on)
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...toolUse({ blocks: [] }, { isErrored: true }) })
    expect(await ui.find({ text: /engine draws its own/ })).toBeDefined()
    await ui.unmount()
  })

  test('a progress call draws one quiet line', async ($, on) => {
    engine(on)
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...toolUse(PROGRESS) })
    expect(await ui.find({ text: /Migrating updated/ })).toBeDefined()
    await ui.unmount()
  })

  test('the result row is hidden: the presentation already is the result', async ($, on) => {
    engine(on)
    const ui = await $.ui.mount({
      plugin: PLUGIN,
      surface: 'terminal',
      component: 'ToolResult',
      requestId: 'tu-1',
      props: { tool_use_id: 'tu-1', tool: TOOL, output: 'Presented to the user…', isErrored: false },
    })
    expect(await ui.find({ text: /Presented|engine/ })).toBeUndefined()
    await ui.unmount()
  })

  test('other tools are left alone', async ($, on) => {
    engine(on)
    const ui = await $.ui.mount({
      plugin: PLUGIN,
      surface: 'terminal',
      component: 'ToolUse',
      requestId: 'tu-2',
      props: { tool_use_id: 'tu-2', tool: 'Bash', input: { command: 'ls' }, isRunning: false, isErrored: false, isInterrupted: false },
    })
    expect(await ui.find({ text: /engine draws its own/ })).toBeDefined()
    await ui.unmount()
  })
})

// ─── commands ───────────────────────────────────────────────────────────────

const commandOutput = (args: string, text: string) => ({
  component: 'CommandOutput' as const,
  props: { command: 'present', args, text, isErrored: false },
})

describe('/present demo', () => {
  test('draws a showcase in the command output row', async ($, on) => {
    engine(on)
    const text = await command($, 'demo architecture')
    expect(text).toMatch(/^Agent Present #1\n/)
    expect(text).toContain('Title: Authentication')
    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: PLUGIN, surface, ...commandOutput('demo architecture', text) })
      expect(await ui.find({ text: /AUTHENTICATION/ })).toBeDefined()
      expect(await ui.find({ text: /Agent Present #1/ })).toBeUndefined()
      await ui.unmount()
    }
    // The terminal's row text carries the plugin's name first.
    const named = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...commandOutput('demo architecture', `agent-present: ${text}`) })
    expect(await named.find({ text: /AUTHENTICATION/ })).toBeDefined()
    await named.unmount()
    expect(await lastShown($, /AUTHENTICATION/)).toBe(true)
  })

  test('all shows every showcase, numbered on from earlier ones', async ($, on) => {
    engine(on)
    await command($, 'demo')
    const text = await command($, 'demo all')
    expect(text.split('\n')[0]).toBe('Agent Present #2 #3 #4 #5 #6 #7 #8')
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...commandOutput('demo all', text) })
    expect(await ui.find({ text: /RELEASE/ })).toBeDefined()
    expect(await ui.find({ text: /AUTHENTICATION/ })).toBeDefined()
    await ui.unmount()
    // The progress showcase is not a final answer: the last one before it is.
    expect(await lastShown($, /PROGRESS|progress/i)).toBe(false)
  })

  test('an unknown demo names the ones there are', async ($, on) => {
    engine(on)
    const text = await command($, 'demo nope')
    expect(text).toContain('Unknown demo "nope"')
    expect(text).toContain('repo-review')
  })

  test('other /present rows and rows from an earlier session are left to the engine', async ($, on) => {
    engine(on)
    for (const text of ['Agent Present #99\nTitle: Old', 'Agent Present: auto. Claude presents when the answer has structure.']) {
      const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...commandOutput('demo', text) })
      expect(await ui.find({ text: /engine draws its own/ })).toBeDefined()
      await ui.unmount()
    }
  })
})

describe('actions', () => {
  test('the band offers the actions of a fresh presentation and runs them', async ($, on) => {
    const log = engine(on)
    await present($)
    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: PLUGIN, surface, ...band(false) })
      expect(await ui.find({ key: 'act-1' })).toBeDefined()
      expect(await ui.find({ key: 'act-2' })).toBeDefined()
      expect(await ui.find({ key: 'explore' })).toBeDefined()
      await ui.unmount()
    }
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...band(false) })
    await ui.press({ key: 'act-1' })
    expect(log.sent).toEqual(['Fix the users migration.'])
    await ui.press({ key: 'act-2' })
    expect(log.copied).toEqual(['v2.8.0'])
    await ui.press({ key: 'explore' })
    expect(log.opened).toEqual([expect.objectContaining({ id: 'agent-present' })])
    await ui.unmount()
  })

  test('the band stays out of the way while working and after the next prompt', async ($, on) => {
    engine(on)
    await present($)
    const working = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...band(true) })
    expect(await working.find({ key: 'act-1' })).toBeUndefined()
    await working.unmount()
    expect(await bandOffers($)).toBe(true)
    await $.prompt.submit({ text: 'next question' } as never)
    expect(await bandOffers($)).toBe(false)
  })

  test('the band can be dismissed', async ($, on) => {
    engine(on)
    await present($)
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...band(false) })
    await ui.press({ key: 'dismiss' })
    await ui.unmount()
    expect(await bandOffers($)).toBe(false)
  })

  test('/present act runs an action by number or id', async ($, on) => {
    const log = engine(on)
    const clock = mock.clock(on)
    await present($)
    expect(await command($, 'act 1')).toBe('Sent to Claude: Fix the users migration.')
    // Queued past the command: a prompt cannot be submitted while the command holds the turn.
    await clock.advance(1)
    expect(log.sent).toEqual(['Fix the users migration.'])
    expect(log.toasts).toEqual([])
    expect(await command($, 'act tag')).toBe('Copied Copy tag.')
    expect(log.copied).toEqual(['v2.8.0'])
    const missing = await command($, 'act 7')
    expect(missing).toContain('1. Fix migration')
    expect(missing).toContain('2. Copy tag')
  })

  test('/present act without a presentation says so', async ($, on) => {
    engine(on)
    expect(await command($, 'act 1')).toContain('No presentation yet')
  })
})

describe('the explorer', () => {
  test('/present view and /present raw open the pane on the last presentation', async ($, on) => {
    const log = engine(on)
    expect(await command($, 'view')).toContain('No presentation yet')
    expect(log.opened).toEqual([])
    await present($)
    expect(await command($, 'view')).toBe('Opened the explorer.')
    expect(log.opened).toEqual([expect.objectContaining({ id: 'agent-present', focus: true, closeOnEscape: true })])
    await command($, 'raw')
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...pane })
    expect(await ui.find({ text: /"present": "0.1"/ })).toBeDefined()
    await ui.unmount()
  })

  test('switches depth, shows the raw document and copies text', async ($, on) => {
    const log = engine(on)
    await present($, {
      ...DOC,
      blocks: [...DOC.blocks, { type: 'text', title: 'Background', priority: 'detail', text: 'Only on explore.' }],
    })
    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: PLUGIN, surface, ...pane })
      expect(await ui.find({ text: /DON'T SHIP YET/ })).toBeDefined()
      await ui.press({ key: 'view-glance' })
      expect(await ui.find({ text: /Only on explore/ })).toBeUndefined()
      await ui.press({ key: 'view-explore' })
      expect(await ui.find({ text: /Only on explore/ })).toBeDefined()
      await ui.press({ key: 'view-raw' })
      expect(await ui.find({ text: /"present": "0.1"/ })).toBeDefined()
      await ui.press({ key: 'copy' })
      await ui.press({ key: 'view-scan' })
      await ui.unmount()
    }
    expect(log.copied).toHaveLength(2)
    expect(log.copied[0]).toContain("DON'T SHIP YET")
    expect(log.copied[0]).toContain('Only on explore.')
    expect(log.toasts).toContain('Copied the presentation as text')
  })

  test('the explorer runs actions and closes', async ($, on) => {
    const log = engine(on)
    await present($)
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...pane })
    await ui.press({ key: 'act-1' })
    expect(log.sent).toEqual(['Fix the users migration.'])
    expect(log.closed).toBe(1)
    await ui.press({ key: 'close' })
    expect(log.closed).toBe(2)
    await ui.unmount()
  })
})

// ─── compatibility mode ─────────────────────────────────────────────────────

describe('/present last', () => {
  const PROSE = 'The release is not ready. 418 tests pass but 11 fail, all in the users migration.'
  const conversation = (on: any) => {
    on('session.messages', () => ({
      value: [
        { role: 'user', text: 'Can we ship?', toolUses: [] },
        { role: 'assistant', text: PROSE, toolUses: [] },
        { role: 'user', text: '/present last', toolUses: [] },
      ],
    }))
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
  }

  test('converts the previous answer into a presentation', async ($, on) => {
    engine(on)
    conversation(on)
    const requests: { prompt: string; system?: string; model: string }[] = []
    on('model.complete', (_$: unknown, e: { prompt: string; system?: string; model: string }) => {
      requests.push(e)
      return { value: { isAnswered: true, text: '```json\n' + JSON.stringify(DOC) + '\n```', usage: USAGE } }
    })
    const text = await command($, 'last')
    expect(text).toMatch(/^Agent Present #1\n/)
    expect(requests).toHaveLength(1)
    expect(requests[0]?.prompt).toContain(PROSE)
    expect(requests[0]?.model).toBe('claude-opus-5-5')
    expect(requests[0]?.system).toContain('Present document')
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...commandOutput('last', text) })
    expect(await ui.find({ text: /DON'T SHIP YET/ })).toBeDefined()
    await ui.unmount()
    expect(await lastShown($, /DON'T SHIP YET/)).toBe(true)
  })

  test('asks again when the reply is not JSON, and repairs schema errors', async ($, on) => {
    engine(on)
    conversation(on)
    const replies = ['Sure! Here you go.', JSON.stringify({ title: 'Bad', blocks: [{ type: 'metric' }] }), JSON.stringify(DOC)]
    on('model.complete', () => ({ value: { isAnswered: true, text: replies.shift() ?? '', usage: USAGE } }))
    const text = await command($, 'last')
    expect(replies).toHaveLength(0)
    expect(text).toContain("Don't ship yet")
  })

  test('reports a failed model call', async ($, on) => {
    engine(on)
    conversation(on)
    on('model.complete', () => ({ value: { isAnswered: false, reason: 'api-error', status: 529, error: 'server_error', usage: USAGE } }))
    expect(await command($, 'last')).toContain('the model call failed (api-error)')
  })

  test('says so when there is no answer yet', async ($, on) => {
    engine(on)
    on('session.messages', () => ({ value: [{ role: 'user', text: 'hi', toolUses: [] }] }))
    expect(await command($, 'last')).toBe('No answer from Claude to present yet.')
  })
})
