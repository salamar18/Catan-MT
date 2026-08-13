import * as fs from 'fs'
import * as path from 'path'
import type { DevelopmentCardCounts, GameState, Player, ResourceCounts } from '../types/gameState'

function formatCountsLine(label: string, c: ResourceCounts): string {
    return `${label}: wood=${c.wood} brick=${c.brick} sheep=${c.sheep} wheat=${c.wheat} ore=${c.ore}`
}

function formatDevLine(label: string, c: DevelopmentCardCounts): string {
    return `${label}: knight=${c.knight} VP=${c.victory_point} road=${c.road_building} YOP=${c.year_of_plenty} mono=${c.monopoly}`
}

function formatHandDetailLines(p: Player): string[] {
    return [
        formatCountsLine('resources', p.inferredResources),
        formatDevLine('development', p.hand.developmentCards),
        `VP=${p.victoryPoints}  knights=${p.knightCount}  longestRoad=${p.hasLongestRoad}  largestArmy=${p.hasLargestArmy}`,
        `handSize=${p.resourceCardCount}`,
    ]
}


export type GameStateLogOptions = {
    /** Shown under the header (e.g. board read timeout / wrong tab). */
    notes?: string[]
}

/**
 * Renders {@link GameState} as plain text: board, turn/meta, my hand, opponent hand, bank, buildable.
 */
export function formatGameStateLog(state: GameState, options: GameStateLogOptions = {}): string {
    const lines: string[] = []
    const now = new Date().toISOString()
    lines.push(`Game state snapshot @ ${now}`)
    lines.push('═'.repeat(72))
    if (options.notes && options.notes.length > 0) {
        lines.push('')
        lines.push('NOTES')
        lines.push('-'.repeat(40))
        for (const n of options.notes) {
            lines.push(`  ${n}`)
        }
    }
    lines.push('')

    lines.push('BOARD — hex tiles')
    lines.push('-'.repeat(40))
    if (state.board.tiles.length === 0) {
        lines.push('  (no tiles yet)')
    } else {
        for (const t of state.board.tiles) {
            const bips = t.bips === undefined ? '—' : String(t.bips)
            lines.push(`  ${t.id}  terrain=${t.terrain}  number=${bips}  robber=${t.hasRobber}`)
        }
    }
    lines.push(`  edges=${state.board.edges.length}  vertices=${state.board.vertices.length}  ports=${state.board.ports.length}`)
    lines.push(`  graph nodes=${Object.keys(state.board.graph.nodes).length}`)
    lines.push('')

    lines.push('TURN / META')
    lines.push('-'.repeat(40))
    lines.push(`  phase=${state.phase}`)
    lines.push(`  currentPlayerId=${state.currentPlayerId || '(unknown)'}`)
    lines.push(`  pointsToWin=${state.pointsToWin}`)
    lines.push(`  winnerId=${state.winnerId ?? 'null'}`)
    lines.push(`  dice: ${state.dice.first}+${state.dice.second}  rolled=${state.dice.rolled}`)
    lines.push('')

    const me = state.players.find((p) => p.id === state.myPlayerId)
    const opponents = state.players.filter((p) => p.id !== state.myPlayerId)

    lines.push(me ? `MY HAND — ${me.name}` : 'MY HAND')
    lines.push('-'.repeat(40))
    if (!me) {
        lines.push('  (local player not found)')
    } else {
        for (const line of formatHandDetailLines(me)) {
            lines.push(`  ${line}`)
        }
    }
    lines.push('')

    if (opponents.length === 0) {
        lines.push('OPPONENT HAND')
        lines.push('-'.repeat(40))
        lines.push('  (none)')
    } else {
        for (let i = 0; i < opponents.length; i++) {
            if (i > 0) lines.push('')
            const opp = opponents[i]
            lines.push(`OPPONENT HAND — ${opp.name}`)
            lines.push('-'.repeat(40))
            for (const line of formatHandDetailLines(opp)) {
                lines.push(`  ${line}`)
            }
        }
    }

    lines.push('')
    lines.push('DECK / BANK')
    lines.push('-'.repeat(40))
    lines.push(`  ${formatDevLine('development deck', state.deck.developmentCards)}`)
    lines.push(`  ${formatCountsLine('resource bank', state.deck.bank)}`)

    lines.push('')
    lines.push('BUILDABLE (this turn)')
    lines.push('-'.repeat(40))
    lines.push(`  road=${state.buildable.road}  settlement=${state.buildable.settlement}  city=${state.buildable.city}`)

    lines.push('')
    lines.push('─'.repeat(72))
    lines.push('JSON (same snapshot, for tools / diff)')
    lines.push(JSON.stringify(state, null, 2))

    return lines.join('\n')
}

/** Default log path: `<repo>/logs/game-state.log` (relative to compiled output in `dist/logger/`). */
export function defaultGameStateLogPath(): string {
    return path.join(__dirname, '..', '..', 'logs', 'game-state.log')
}

/**
 * Overwrites the log file with the latest snapshot (no append — file always reflects current read).
 */
export function writeGameStateLog(
    state: GameState,
    filePath = defaultGameStateLogPath(),
    options: GameStateLogOptions = {},
): void {
    const dir = path.dirname(filePath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filePath, formatGameStateLog(state, options), 'utf8')
}
