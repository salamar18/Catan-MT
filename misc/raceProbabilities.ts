export module ArrayUtils {
    export function randomElementFromArray<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)]
    }

    export function removeElementFromArray<T>(array: T[], element: T): boolean {
        const index = array.indexOf(element)
        if(index > -1) {
            array.splice(index, 1)
            return true
        }
        return false
    }
}

export interface DicePair {
    dice1: number
    dice2: number
}

export enum PlayerColor {
    None = 0,
    Red = 1,
    Blue = 2,
    Orange = 3,
    Green = 4,
    Black = 5,
    Bronze = 6,
    Silver = 7,
    Gold = 8,
    White = 9,
    Purple = 10,
    MysticBlue = 11,
    Pink = 12,
}

interface StandardDiceDeck {
    totalDice: number
    dicePairs: DicePair[]
}

interface WeightedDiceDeck {
    totalDice: number
    dicePairs: DicePair[]
    probabilityWeighting: number
    recentlyRolledCount: number
}

class DiceControllerBalanced {
    private readonly minimumCardsBeforeReshuffling: number
    private readonly probabilityReductionForRecentlyRolled: number
    private readonly probabilityReductionForSevenStreaks: number

    private weightedDiceDeck: WeightedDiceDeck[]
    private cardsLeftInDeck: number
    private readonly recentRolls: number[]
    private readonly maximumRecentRollMemory: number

    private readonly sevenStreakCount: {playerColor: PlayerColor, streakCount: number}
    private readonly totalSevensRolledByPlayer: Map<PlayerColor, number>

    constructor() {
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
    }

    throwDice(playerColor: PlayerColor): DicePair {
        this.initTotalSevens(playerColor)
        return this.drawWeightedCard(playerColor)
    }

    private drawWeightedCard(playerColor: PlayerColor): DicePair {
        if(this.cardsLeftInDeck < this.minimumCardsBeforeReshuffling) this.reshuffleWeightedDiceDeck()
        this.updateWeightedDiceDeckProbabilities()
        this.adjustWeightedDiceDeckBasedOnRecentRolls()
        this.adjustSevenProbabilityBasedOnSevens(playerColor)
        return this.getWeightedDice(playerColor)
    }

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

    private reshuffleWeightedDiceDeck() {
        const standardDiceDeck = DiceControllerBalanced.getStandardDiceDeck()

        for(const [totalDiceIndex, dicePairsForTotalDice] of standardDiceDeck.entries()) {
            this.weightedDiceDeck[totalDiceIndex].dicePairs = dicePairsForTotalDice.dicePairs
        }

        const totalCombinations = 36
        this.cardsLeftInDeck = totalCombinations
    }

    private updateWeightedDiceDeckProbabilities() {
        for(const diceDeckForTotalDice of this.weightedDiceDeck) {
            diceDeckForTotalDice.probabilityWeighting = diceDeckForTotalDice.dicePairs.length / this.cardsLeftInDeck
        }
    }

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

        console.error('Something seriously wrong with weighted dice deck')
        const defaultRollIfError = {dice1: 3, dice2: 4}
        return defaultRollIfError
    }

    private getTotalProbabilityWeight(): number {
        let totalProbabilityWeight = 0
        for(const dicePairs of this.weightedDiceDeck) {
            totalProbabilityWeight += dicePairs.probabilityWeighting
        }

        return totalProbabilityWeight
    }

    private updateRecentlyRolled() {
        const ignore0and1 = 2
        const totalDiceFiveRollsAgo = this.recentRolls[0]
        this.weightedDiceDeck[totalDiceFiveRollsAgo - ignore0and1].recentlyRolledCount -= 1
        this.recentRolls.shift()
    }

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

    protected adjustSevenProbabilityBasedOnSevens(playerColor: PlayerColor) {
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

    private getStreakAdjustmentConstant(player: PlayerColor): number {
        const isStreakForOrAgainstPlayer = this.sevenStreakCount.playerColor == player ? -1 : 1
        return this.probabilityReductionForSevenStreaks * this.sevenStreakCount.streakCount * isStreakForOrAgainstPlayer
    }

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

/////////////////////////////////////

const players = [PlayerColor.Black, PlayerColor.Orange];
const wonTimes = [0, 0];
const ports = [4, 3];
const GAME_NUM = 1e6;
for (let i = 0; i < GAME_NUM; ++i) {
    const diceController = new DiceControllerBalanced();
    const resources = [
        {lumber:1, brick:1, wool:0, grain:1, ore:0},
        {lumber:1, brick:1, wool:0, grain:0, ore:1}
    ];
    for (let playerId = 0;; playerId ^= 1) {
        const playerColor = players[playerId];
        const dicePair = diceController.throwDice(playerColor);
        const totalDice = dicePair.dice1 + dicePair.dice2;
        switch (totalDice) {
            case 3:
                resources[0].grain += 1;
                resources[1].ore += 1;
                break;
            case 4:
                resources[0].grain += 1;
                resources[0].lumber += 1;
                break;
            case 5:
                resources[0].wool += 1;
                break;
            case 6:
                resources[0].brick += 1;
                resources[1].lumber += 1;
                break;
            case 8:
                resources[1].grain += 1;
                break;
            case 9:
                resources[1].brick += 1;
                break;
            case 10:
                resources[0].ore += 1;
                resources[1].ore += 1;
                break;
        }
        const {lumber, brick, wool, grain, ore} = resources[playerId];
        const missing = [2 - lumber, 2 - brick, 1 - wool, 1 - grain].map(x => Math.max(x, 0)).reduce((a,b)=>a+b)
        const excess = [lumber - 2, brick - 2, wool - 1, grain - 1, ore].map(x => Math.max(x, 0) / ports[playerId] | 0).reduce((a,b)=>a+b)
        if (missing <= excess) {
            wonTimes[playerId] += 1;
            break;
        }
    }
}

const wonPercentage = wonTimes.map((x, i) => PlayerColor[players[i]] + ": " + (x / GAME_NUM * 100).toFixed(2) + "%")
console.log(wonPercentage)