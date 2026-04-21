/**
 * Balanced dice (as used on Colonist-style implementations): not independent 2d6 each roll.
 *
 * Core idea: treat all 36 ordered dice outcomes as a deck of "cards". Each roll removes one card
 * from its sum bucket (2–12). That enforces exact 2d6 frequencies over each full 36-card cycle.
 *
 * On top of that deck:
 * 1) "Recently rolled" dampening — sums that appeared often in the last few rolls get lower weight
 *    so the same totals clump less.
 * 2) Seven tuning — the weight for sum 7 is scaled per current roller to reduce robber streaks and
 *    spread 7s more evenly across players over time.
 *
 * Event die (CK) is delegated to DiceControllerBalancedCKEventDie.
 */

interface StandardDiceDeck {
    totalDice: number
    dicePairs: DicePair[]
}

/** One row in the table: all remaining (dice1,dice2) pairs for this sum, plus tuning fields. */
interface WeightedDiceDeck {
    totalDice: number
    dicePairs: DicePair[]
    probabilityWeighting: number
    recentlyRolledCount: number
}

export class DiceControllerBalanced extends BaseDiceController {
    /** Reshuffle when this many cards remain (keeps deck from running empty mid-adjustment). */
    private readonly minimumCardsBeforeReshuffling: number

    /** Per recent appearance of a sum: how much to shave off its selection weight (0–1 scale). */
    private readonly probabilityReductionForRecentlyRolled: number

    /** Strength of streak / anti-streak effect on 7s. */
    private readonly probabilityReductionForSevenStreaks: number

    /** Index 0 = total 2, … index 10 = total 12 (see ignore0and1 = 2 when mapping sum → index). */
    private weightedDiceDeck: WeightedDiceDeck[]

    /** Cards not yet drawn this cycle (starts at 36 after reshuffle). */
    private cardsLeftInDeck: number
    
    /** FIFO of recent sum totals (2–12) for dampening. */
    private readonly recentRolls: number[]
    private readonly maximumRecentRollMemory: number
    private readonly weightedEventDiceDeck: DiceControllerBalancedCKEventDie

    /** Last player who rolled 7 and how many 7s in a row for that player. */
    private readonly sevenStreakCount: {playerColor: PlayerColor, streakCount: number}
    private readonly totalSevensRolledByPlayer: Map<PlayerColor, number>

    private readonly logger: Logger
    private readonly numberOfPlayers: number

    constructor(gameController: GameController) {
        super()

        this.logger = gameController.logger
        this.numberOfPlayers = gameController.players.length

        this.initWeightedDiceDeck()
        this.reshuffleWeightedDiceDeck()
        this.updateWeightedDiceDeckProbabilities()

        this.minimumCardsBeforeReshuffling = 13
        this.probabilityReductionForRecentlyRolled = 0.34
        this.probabilityReductionForSevenStreaks = 0.4

        this.recentRolls = []
        this.maximumRecentRollMemory = 5

        this.sevenStreakCount = {playerColor: PlayerColor.None, streakCount: 0}
        this.totalSevensRolledByPlayer = new Map<PlayerColor, number>()

        this.weightedEventDiceDeck = new DiceControllerBalancedCKEventDie(this.logger)
    }

    throwDice(playerColor: PlayerColor): DicePair {
        this.initTotalSevens(playerColor)
        return this.drawWeightedCard(playerColor)
    }

    throwEventDice(): number {
        return this.weightedEventDiceDeck.throwEventDice()
    }

    /**
     * One balanced roll: optionally refill deck, recompute base weights from remaining cards,
     * apply recent-roll multipliers, tune 7 for this player, then weighted-pick one concrete pair.
     */
    private drawWeightedCard(playerColor: PlayerColor): DicePair {
        if(this.cardsLeftInDeck < this.minimumCardsBeforeReshuffling) this.reshuffleWeightedDiceDeck()
        this.updateWeightedDiceDeckProbabilities()
        this.adjustWeightedDiceDeckBasedOnRecentRolls()
        this.adjustSevenProbabilityBasedOnSevens(playerColor)
        return this.getWeightedDice(playerColor)
    }

    /** Eleven buckets for sums 2…12; pairs filled on reshuffle from getStandardDiceDeck(). */
    private initWeightedDiceDeck() {
        this.weightedDiceDeck = []
        this.weightedDiceDeck.push({totalDice: 2, dicePairs: [], probabilityWeighting: 0, recentlyRolledCount: 0})
        this.weightedDiceDeck.push({totalDice: 3, dicePairs: [], probabilityWeighting: 0, recentlyRolledCount: 0})
        this.weightedDiceDeck.push({totalDice: 4, dicePairs: [], probabilityWeighting: 0, recentlyRolledCount: 0})
        this.weightedDiceDeck.push({totalDice: 5, dicePairs: [], probabilityWeighting: 0, recentlyRolledCount: 0})
        this.weightedDiceDeck.push({totalDice: 6, dicePairs: [], probabilityWeighting: 0, recentlyRolledCount: 0})
        this.weightedDiceDeck.push({totalDice: 7, dicePairs: [], probabilityWeighting: 0, recentlyRolledCount: 0})
        this.weightedDiceDeck.push({totalDice: 8, dicePairs: [], probabilityWeighting: 0, recentlyRolledCount: 0})
        this.weightedDiceDeck.push({totalDice: 9, dicePairs: [], probabilityWeighting: 0, recentlyRolledCount: 0})
        this.weightedDiceDeck.push({totalDice: 10, dicePairs: [], probabilityWeighting: 0, recentlyRolledCount: 0})
        this.weightedDiceDeck.push({totalDice: 11, dicePairs: [], probabilityWeighting: 0, recentlyRolledCount: 0})
        this.weightedDiceDeck.push({totalDice: 12, dicePairs: [], probabilityWeighting: 0, recentlyRolledCount: 0})
    }

    /** Full 36 ordered outcomes back into buckets; cardsLeftInDeck = 36. */
    private reshuffleWeightedDiceDeck() {
        const standardDiceDeck = DiceControllerBalanced.getStandardDiceDeck()

        for(const [totalDiceIndex, dicePairsForTotalDice] of standardDiceDeck.entries()) {
            this.weightedDiceDeck[totalDiceIndex].dicePairs = dicePairsForTotalDice.dicePairs
        }

        const totalCombinations = 36
        this.cardsLeftInDeck = totalCombinations
    }

    /** Base weight for each sum = (cards left in that bucket) / (cards left in deck). */
    private updateWeightedDiceDeckProbabilities() {
        for(const diceDeckForTotalDice of this.weightedDiceDeck) {
            diceDeckForTotalDice.probabilityWeighting = diceDeckForTotalDice.dicePairs.length / this.cardsLeftInDeck
        }
    }

    /**
     * Weighted random over sums using current probabilityWeighting, then uniform random pair in bucket.
     * Removes drawn pair, records sum for recent-roll tracking, handles seven streak stats.
     */
    private getWeightedDice(playerColor: PlayerColor): DicePair {
        const totalProbabilityWeight = this.getTotalProbabilityWeight()

        let targetRandomNumber = Math.random() * totalProbabilityWeight
        for(const diceDeckForTotalDice of this.weightedDiceDeck) {
            if(targetRandomNumber <= diceDeckForTotalDice.probabilityWeighting) {
                const drawnCard = ArrayUtils.randomElementFromArray(diceDeckForTotalDice.dicePairs)
                ArrayUtils.removeElementFromArray(diceDeckForTotalDice.dicePairs, drawnCard)

                this.recentRolls.push(diceDeckForTotalDice.totalDice)
                diceDeckForTotalDice.recentlyRolledCount += 1
                this.cardsLeftInDeck -= 1

                if(this.recentRolls.length > this.maximumRecentRollMemory) this.updateRecentlyRolled()
                if(diceDeckForTotalDice.totalDice == 7) this.updateSevenRolls(playerColor)
                return drawnCard
            }
            targetRandomNumber -= diceDeckForTotalDice.probabilityWeighting
        }

        this.logger.logError('Something seriously wrong with weighted dice deck')
        const defaultRollIfError = {dice1: 3, dice2: 4}
        return defaultRollIfError
    }

    /** Sum of bucket weights after adjustments (used to normalize Math.random). */
    private getTotalProbabilityWeight(): number {
        let totalProbabilityWeight = 0
        for(const dicePairs of this.weightedDiceDeck) {
            totalProbabilityWeight += dicePairs.probabilityWeighting
        }

        return totalProbabilityWeight
    }

    /** Oldest roll falls out of the sliding window; decrement its recentlyRolledCount. */
    private updateRecentlyRolled() {
        const ignore0and1 = 2
        const totalDiceFiveRollsAgo = this.recentRolls[0]
        this.weightedDiceDeck[totalDiceFiveRollsAgo - ignore0and1].recentlyRolledCount -= 1
        this.recentRolls.shift()
    }

    /**
     * Each sum's weight *= (1 - 0.34 * recentlyRolledCount). Count bumps when that sum is rolled and
     * decays as rolls age out of recentRolls (max 5 remembered).
     */
    private adjustWeightedDiceDeckBasedOnRecentRolls() {
        for(const diceDeckForTotalDice of this.weightedDiceDeck) {
            const probabilityReduction = (diceDeckForTotalDice.recentlyRolledCount * this.probabilityReductionForRecentlyRolled)
            const probabilityMultiplier = 1 - probabilityReduction
            diceDeckForTotalDice.probabilityWeighting *= probabilityMultiplier
            if(diceDeckForTotalDice.probabilityWeighting < 0) diceDeckForTotalDice.probabilityWeighting = 0
        }
    }

    private initTotalSevens(playerColor: PlayerColor) {
        if(this.totalSevensRolledByPlayer.get(playerColor) != undefined) return
        this.totalSevensRolledByPlayer.set(playerColor, 0)
    }

    private updateSevenRolls(playerColor: PlayerColor) {
        const sevensRolledByPlayer = this.totalSevensRolledByPlayer.get(playerColor) ?? 0
        this.totalSevensRolledByPlayer.set(playerColor, sevensRolledByPlayer + 1)

        if(playerColor == this.sevenStreakCount.playerColor) {
            this.sevenStreakCount.streakCount += 1
            return
        }

        this.sevenStreakCount.playerColor = playerColor
        this.sevenStreakCount.streakCount = 1
    }

    /**
     * Only multi-player: scales the 7 row's probabilityWeighting before the draw.
     * Combines (a) fairness vs equal share of all 7s across players and (b) streak softening.
     */
    protected adjustSevenProbabilityBasedOnSevens(playerColor: PlayerColor) {
        if(this.numberOfPlayers < 2) return
        const streakAdjustmentPercentage = this.getStreakAdjustmentConstant(playerColor)
        const playerSevensAdjustmentPercentage = this.getSevenImbalanceAdjustment(playerColor)

        let sevenProbabilityAdjustment = 1 * playerSevensAdjustmentPercentage + streakAdjustmentPercentage

        const minimumAdjustment = 0
        const maximumAdjustment = 2
        if(sevenProbabilityAdjustment < minimumAdjustment) sevenProbabilityAdjustment = minimumAdjustment
        if(sevenProbabilityAdjustment > maximumAdjustment) sevenProbabilityAdjustment = maximumAdjustment

        const ignore0and1 = 2
        const sevenIndex = 7 - ignore0and1
        this.weightedDiceDeck[sevenIndex].probabilityWeighting *= sevenProbabilityAdjustment
    }

    /**
     * Same player keeps rolling 7 → negative term lowers 7 chance for them next time.
     * Someone else on a streak → positive term raises 7 chance for the current roller (catch-up).
     */
    private getStreakAdjustmentConstant(player: PlayerColor): number {
        const isStreakForOrAgainstPlayer = this.sevenStreakCount.playerColor == player ? -1 : 1
        return this.probabilityReductionForSevenStreaks * this.sevenStreakCount.streakCount * isStreakForOrAgainstPlayer
    }

    /**
     * Multiplier near 1 if everyone has ~equal share of 7s; below 1 if this player has too many 7s,
     * above 1 if too few. Skips until enough total 7s have been rolled to compare fairly.
     */
    private getSevenImbalanceAdjustment(playerColor: PlayerColor): number {
        const totalSevens = this.getTotalSevensRolled()
        if(totalSevens < this.totalSevensRolledByPlayer.size) return 1

        const sevensPerPlayer = this.totalSevensRolledByPlayer.get(playerColor) ?? 0

        const percentageOfTotalSevens = sevensPerPlayer / totalSevens
        const idealPercentageOfTotalSevens = 1 / this.totalSevensRolledByPlayer.size

        const adjustmentBecauseOfSevensImbalance = 1 + ((idealPercentageOfTotalSevens - percentageOfTotalSevens) / idealPercentageOfTotalSevens)

        return adjustmentBecauseOfSevensImbalance
    }

    private getTotalSevensRolled(): number {
        let totalSevensRolled = 0
        for(const totalSevensRolledByPlayer of this.totalSevensRolledByPlayer.values()) {
            totalSevensRolled += totalSevensRolledByPlayer
        }

        return totalSevensRolled
    }

    /** Canonical 2d6: 36 ordered pairs grouped by sum (index 0 = 2, … index 10 = 12). */
    private static getStandardDiceDeck(): StandardDiceDeck[] {
        const standardDiceDeck: StandardDiceDeck[] = []
        standardDiceDeck.push({totalDice: 2, dicePairs: [{dice1: 1, dice2: 1}]})
        standardDiceDeck.push({totalDice: 3, dicePairs: [{dice1: 1, dice2: 2}, {dice1: 2, dice2: 1}]})
        standardDiceDeck.push({totalDice: 4, dicePairs: [{dice1: 1, dice2: 3}, {dice1: 2, dice2: 2}, {dice1: 3, dice2: 1}]})
        standardDiceDeck.push({totalDice: 5, dicePairs: [{dice1: 1, dice2: 4}, {dice1: 2, dice2: 3}, {dice1: 3, dice2: 2}, {dice1: 4, dice2: 1}]})
        standardDiceDeck.push({totalDice: 6, dicePairs: [{dice1: 1, dice2: 5}, {dice1: 2, dice2: 4}, {dice1: 3, dice2: 3}, {dice1: 4, dice2: 2}, {dice1: 5, dice2: 1}]})
        standardDiceDeck.push({totalDice: 7, dicePairs: [{dice1: 1, dice2: 6}, {dice1: 2, dice2: 5}, {dice1: 3, dice2: 4}, {dice1: 4, dice2: 3}, {dice1: 5, dice2: 2}, {dice1: 6, dice2: 1}]})
        standardDiceDeck.push({totalDice: 8, dicePairs: [{dice1: 2, dice2: 6}, {dice1: 3, dice2: 5}, {dice1: 4, dice2: 4}, {dice1: 5, dice2: 3}, {dice1: 6, dice2: 2}]})
        standardDiceDeck.push({totalDice: 9, dicePairs: [{dice1: 3, dice2: 6}, {dice1: 4, dice2: 5}, {dice1: 5, dice2: 4}, {dice1: 6, dice2: 3}]})
        standardDiceDeck.push({totalDice: 10, dicePairs: [{dice1: 4, dice2: 6}, {dice1: 5, dice2: 5}, {dice1: 6, dice2: 4}]})
        standardDiceDeck.push({totalDice: 11, dicePairs: [{dice1: 5, dice2: 6}, {dice1: 6, dice2: 5}]})
        standardDiceDeck.push({totalDice: 12, dicePairs: [{dice1: 6, dice2: 6}]})

        return standardDiceDeck
    }
}
