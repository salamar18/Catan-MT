import type { Page } from 'playwright'
import { defaultGameStateLogPath, writeGameStateLog } from '../logger/gameStateLog'
import type {
    Board,
    BoardGraph,
    Buildable,
    Deck,
    DevelopmentCardCounts,
    DevelopmentDeck,
    Dice,
    GamePhase,
    GameState,
    Hand,
    ResourceBank,
    ResourceCounts,
} from '../types/gameState'

function emptyResourceCounts(): ResourceCounts {
    return { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }
}

function emptyDevelopmentCardCounts(): DevelopmentCardCounts {
    return {
        knight: 0,
        victory_point: 0,
        road_building: 0,
        year_of_plenty: 0,
        monopoly: 0,
    }
}

function emptyHand(): Hand {
    return {
        resources: emptyResourceCounts(),
        developmentCards: emptyDevelopmentCardCounts(),
        knightsPlayed: 0,
        victoryPoints: 0,
    }
}

function emptyBoardGraph(): BoardGraph {
    return { nodes: {}, adjacency: {} }
}

function emptyBoard(): Board {
    return {
        tiles: [],
        edges: [],
        vertices: [],
        ports: [],
        graph: emptyBoardGraph(),
    }
}

function emptyDevelopmentDeck(): DevelopmentDeck {
    return emptyDevelopmentCardCounts()
}

function emptyResourceBank(): ResourceBank {
    return emptyResourceCounts()
}

function emptyDeck(): Deck {
    return {
        developmentCards: emptyDevelopmentDeck(),
        bank: emptyResourceBank(),
    }
}

function emptyDice(): Dice {
    // Placeholder before first roll is read from the page
    return { first: 1, second: 1, rolled: false }
}

function emptyBuildable(): Buildable {
    return { road: 0, settlement: 0, city: 0 }
}

/**
 * Fresh {@link GameState} after entering a match: valid shape, empty board graph and lists.
 * Counts are zero until DOM / game data is parsed (TODO).
 *
 * Defaults: phase `initial_placement`, pointsToWin 15 (matches ranked-style bot setup).
 */
function createInitialGameState(): GameState {
    const phase: GamePhase = 'initial_placement'
    return {
        board: emptyBoard(),
        players: [],
        currentPlayerId: '',
        phase,
        dice: emptyDice(),
        deck: emptyDeck(),
        myHand: emptyHand(),
        buildable: emptyBuildable(),
        winnerId: null,
        pointsToWin: 15,
    }
}


/**
 * Read current game state from the page (e.g. DOM or game API).
 * Today returns an initialized empty {@link GameState}; parsing Colonist UI comes later.
 *
 * @returns Current scaffolded game state, or `null` if not in a game / not ready (reserved for future checks).
 */
async function readGameState(page: Page): Promise<GameState | null> {
    const state = createInitialGameState()
    const notes: string[] = []
    // TODO: return null when clearly not in a game (lobby / main menu)
    try {

    } catch (err) {

    }

    writeGameStateLog(state, undefined, { notes })
    console.log(`[readGameState] log → ${defaultGameStateLogPath()} (${state.board.tiles.length} land hexes)`)

    return state
}

export = readGameState
