import type {
    Board, Buildable, Deck, DevelopmentCardCounts,
    Edge, GamePhase, GameState, Hand, HexTile, Player,
    Port, ResourceCounts, ResourceType, TerrainType, Vertex,
} from '../types/gameState'

// ─── Lookup tables ────────────────────────────────────────────────────────────

const TERRAIN: Record<number, TerrainType> = {
    0: 'desert', 1: 'wood', 2: 'brick', 3: 'sheep', 4: 'wheat', 5: 'ore',
}

const RESOURCE: Record<number, ResourceType> = {
    1: 'wood', 2: 'brick', 3: 'sheep', 4: 'wheat', 5: 'ore',
}

const PORT_RESOURCE: Record<number, ResourceType | 'any'> = {
    1: 'any', 2: 'wood', 3: 'brick', 4: 'sheep', 5: 'wheat', 6: 'ore',
}

const COLOR_NAME: Record<number, string> = {
    1: 'red', 2: 'blue', 3: 'orange', 4: 'green', 5: 'brown', 6: 'white',
}

// Dev card type numbers observed from WS (to be refined as more data comes in)
const DEV_CARD: Record<number, keyof DevelopmentCardCounts> = {
    0: 'knight', 1: 'road_building', 2: 'year_of_plenty', 3: 'monopoly', 4: 'victory_point',
}

// ─── Raw state cache ──────────────────────────────────────────────────────────

interface WsRawState {
    gameState: any
    playerUserStates: any[]
    myPlayerColor: number
    pointsToWin: number
}

let _raw: WsRawState | null = null

export function handleFullState(payload: any): void {
    _raw = {
        gameState: JSON.parse(JSON.stringify(payload.gameState)),
        playerUserStates: payload.playerUserStates,
        myPlayerColor: payload.playerColor,
        pointsToWin: payload.gameSettings?.victoryPointsToWin ?? 10,
    }
}

export function handleDiff(diff: any): void {
    if (!_raw) return
    deepMerge(_raw.gameState, diff)
}

export function deriveGameState(): GameState | null {
    if (!_raw) return null
    return buildGameState(_raw)
}

// ─── Deep merge (objects merged recursively, arrays/primitives replaced) ──────

function deepMerge(target: any, source: any): void {
    for (const key of Object.keys(source)) {
        const sv = source[key]
        const tv = target[key]
        if (sv !== null && typeof sv === 'object' && !Array.isArray(sv)
            && tv !== null && typeof tv === 'object' && !Array.isArray(tv)) {
            deepMerge(tv, sv)
        } else {
            target[key] = sv
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyResourceCounts(): ResourceCounts {
    return { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }
}

function emptyDevCounts(): DevelopmentCardCounts {
    return { knight: 0, victory_point: 0, road_building: 0, year_of_plenty: 0, monopoly: 0 }
}

function parseResourceCards(cards: number[]): ResourceCounts {
    const counts = emptyResourceCounts()
    for (const c of cards) {
        const r = RESOURCE[c]
        if (r) counts[r]++
    }
    return counts
}

function parseDevCards(cards: number[]): DevelopmentCardCounts {
    const counts = emptyDevCounts()
    for (const c of cards) {
        const key = DEV_CARD[c]
        if (key) counts[key]++
    }
    return counts
}

function parseHand(ps: any, devPs: any): Hand {
    const used: number[] = devPs?.developmentCardsUsed ?? []
    return {
        resources: parseResourceCards(ps?.resourceCards?.cards ?? []),
        developmentCards: parseDevCards(devPs?.developmentCards?.cards ?? []),
        knightsPlayed: used.filter((c: number) => c === 0).length,
        victoryPoints: Object.values(ps?.victoryPointsState ?? {})
            .reduce((sum: number, v: any) => sum + Number(v), 0),
    }
}

// ─── Main builder ─────────────────────────────────────────────────────────────

function buildGameState(raw: WsRawState): GameState {
    const gs = raw.gameState
    const mapState = gs.mapState ?? {}
    const currentState = gs.currentState ?? {}
    const robberTileIdx: number = gs.mechanicRobberState?.locationTileIndex ?? -1
    const devState = gs.mechanicDevelopmentCardsState ?? {}

    const tiles: HexTile[] = Object.entries(mapState.tileHexStates ?? {}).map(([id, t]: [string, any]) => ({
        id,
        x: t.x,
        y: t.y,
        terrain: TERRAIN[t.type] ?? 'desert',
        bips: t.diceNumber === 0 ? undefined : t.diceNumber,
        hasRobber: Number(id) === robberTileIdx,
    }))

    const vertices: Vertex[] = Object.entries(mapState.tileCornerStates ?? {}).map(([id, c]: [string, any]) => ({
        id,
        x: c.x,
        y: c.y,
        z: c.z as 0 | 1,
        settlementOwnerId: c.owner != null ? String(c.owner) : null,
        buildingType: c.buildingType === 1 ? 'settlement' : c.buildingType === 2 ? 'city' : null,
    }))

    const edges: Edge[] = Object.entries(mapState.tileEdgeStates ?? {}).map(([id, e]: [string, any]) => ({
        id,
        x: e.x,
        y: e.y,
        z: e.z as 0 | 1 | 2,
        roadOwnerId: e.owner != null ? String(e.owner) : null,
    }))

    const ports: Port[] = Object.entries(mapState.portEdgeStates ?? {}).map(([id, p]: [string, any]) => ({
        id,
        x: p.x,
        y: p.y,
        z: p.z as 0 | 1 | 2,
        resource: PORT_RESOURCE[p.type] ?? 'any',
    }))

    const board: Board = { tiles, edges, vertices, ports, graph: { nodes: {}, adjacency: {} } }

    const players: Player[] = (raw.playerUserStates ?? []).map((u: any) => {
        const ps = gs.playerStates?.[u.selectedColor] ?? {}
        const devPs = devState.players?.[u.selectedColor]
        return {
            id: String(u.selectedColor),
            name: u.username,
            color: COLOR_NAME[u.selectedColor] ?? String(u.selectedColor),
            victoryPoints: Object.values(ps.victoryPointsState ?? {})
                .reduce((sum: number, v: any) => sum + Number(v), 0),
            knightCount: (devPs?.developmentCardsUsed ?? []).filter((c: number) => c === 0).length,
            hasLongestRoad: !!(gs.mechanicLongestRoadState?.[u.selectedColor]?.hasLongestRoad),
            hasLargestArmy: !!(gs.mechanicLargestArmyState?.[u.selectedColor]?.hasLargestArmy),
            hand: parseHand(ps, devPs),
        }
    })

    const myPs = gs.playerStates?.[raw.myPlayerColor] ?? {}
    const myDevPs = devState.players?.[raw.myPlayerColor]
    const myHand = parseHand(myPs, myDevPs)

    const bankCards = gs.bankState?.resourceCards ?? {}
    const bank: ResourceCounts = {
        wood: bankCards['1'] ?? 0,
        brick: bankCards['2'] ?? 0,
        sheep: bankCards['3'] ?? 0,
        wheat: bankCards['4'] ?? 0,
        ore: bankCards['5'] ?? 0,
    }

    const deck: Deck = {
        developmentCards: parseDevCards(devState.bankDevelopmentCards?.cards ?? []),
        bank,
    }

    const phase: GamePhase = currentState.turnState === 0 ? 'initial_placement' : 'rolling'

    const diceState = gs.diceState ?? {}
    const dice = {
        first: diceState.dice1 ?? 1,
        second: diceState.dice2 ?? 1,
        rolled: diceState.diceThrown ?? false,
    }

    const buildable: Buildable = {
        road: gs.mechanicRoadState?.[raw.myPlayerColor]?.bankRoadAmount ?? 0,
        settlement: gs.mechanicSettlementState?.[raw.myPlayerColor]?.bankSettlementAmount ?? 0,
        city: gs.mechanicCityState?.[raw.myPlayerColor]?.bankCityAmount ?? 0,
    }

    return {
        board,
        players,
        currentPlayerId: String(currentState.currentTurnPlayerColor ?? ''),
        phase,
        dice,
        deck,
        myHand,
        buildable,
        winnerId: null,
        pointsToWin: raw.pointsToWin,
    }
}
