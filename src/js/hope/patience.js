/**
 * Patience module for H.O.P.E. system
 * Manages patience-related gameplay mechanics
 */

class PatienceManager extends EffectableEntity {
    constructor() {
        super({ description: 'Manages patience hours for the H.O.P.E. system' });
        this.enabled = false;
        this.currentHours = 6;
        this.maxHours = 12;
        this.lastDailyClaimDate = null;
    }

    /**
     * Enable the patience system
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Reset the patience manager state
     */
    reset() {
        this.enabled = false;
        this.currentHours = 0;
        this.lastDailyClaimDate = null;
        this.activeEffects = [];
        this.booleanFlags = new Set();
    }

    /**
     * Add patience hours (capped at max)
     * @param {number} hours - Hours to add
     */
    addPatience(hours) {
        this.currentHours = Math.min(this.currentHours + hours, this.maxHours);
    }

    /**
     * Spend patience hours to gain superalloy
     * @param {number} hours - Hours to spend
     * @returns {boolean} Whether the spend was successful
     */
    spendPatience(hours) {
        if (!this.enabled || hours <= 0 || hours > this.currentHours) {
            return false;
        }

        const { superalloyGain, advancedResearchGain, oneillGain, oneillCapacity } = this.calculateSpendGains(hours);
        const noGains = superalloyGain <= 0 && advancedResearchGain <= 0 && oneillGain <= 0;
        if (noGains) {
            return false;
        }

        this.currentHours -= hours;

        if (superalloyGain > 0) {
            resources.colony.superalloys.increase(superalloyGain, false);
        }

        if (advancedResearchGain > 0 && resources.colony.advancedResearch?.unlocked) {
            resources.colony.advancedResearch.increase(advancedResearchGain, false);
        }

        if (oneillGain > 0 && spaceManager?.setOneillCylinderCount) {
            const currentCount = spaceManager.getOneillCylinderCount?.() || 0;
            const capacity = oneillCapacity ?? 0;
            const next = currentCount + oneillGain;
            spaceManager.setOneillCylinderCount(next, capacity);
            updateOneillCylinderStatsUI({
                space: spaceManager,
                galaxy: galaxyManager
            });
        }

        return true;
    }

    calculateSpendGains(hours) {
        if (!this.enabled || hours <= 0) {
            return {
                superalloyGain: 0,
                advancedResearchGain: 0,
                oneillGain: 0,
                oneillCapacity: 0
            };
        }

        const seconds = hours * 3600;
        const colonyResources = resources?.colony;

        const superalloyResource = colonyResources?.superalloys;
        const superalloyRate = superalloyResource?.productionRate || 0;
        const superalloyGain = superalloyRate > 0 ? superalloyRate * seconds : 0;

        const advancedResearchResource = colonyResources?.advancedResearch;
        const advancedResearchRate = advancedResearchResource?.unlocked ? (advancedResearchResource.productionRate || 0) : 0;
        const advancedResearchGain = advancedResearchRate > 0 ? advancedResearchRate * seconds : 0;

        const unlockedOneill = spaceManager?.isBooleanFlagSet?.('oneillCylinders');
        const oneillCapacity = unlockedOneill ? getOneillCylinderCapacity(galaxyManager) : 0;
        const currentOneill = spaceManager?.getOneillCylinderCount?.() || 0;
        const effectiveWorlds = spaceManager?.getTerraformedPlanetCount?.() || 0;
        const hasCapacity = oneillCapacity > 0 && unlockedOneill && effectiveWorlds > 0;

        let oneillGain = 0;
        if (hasCapacity) {
            const baseRate = effectiveWorlds / (100 * 3600);
            const remainingFraction = 1 - (currentOneill / oneillCapacity);
            const perSecond = baseRate * (remainingFraction > 0 ? remainingFraction : 0);
            oneillGain = perSecond > 0 ? perSecond * seconds : 0;
            const availableRoom = oneillCapacity - currentOneill;
            if (oneillGain > availableRoom) {
                oneillGain = availableRoom;
            } else if (oneillGain < 0) {
                oneillGain = 0;
            }
        }

        return {
            superalloyGain,
            advancedResearchGain,
            oneillGain,
            oneillCapacity
        };
    }

    /**
     * Called when terraforming is completed
     */
    onTerraformingComplete() {
        if (this.enabled) {
            this.addPatience(3);
        }
    }

    /**
     * Get the current UTC date string (YYYY-MM-DD)
     * @returns {string}
     */
    getCurrentUTCDateString() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }

    /**
     * Check and claim daily patience if available
     */
    checkDailyPatience() {
        if (!this.enabled) return;
        
        const today = this.getCurrentUTCDateString();
        if (this.lastDailyClaimDate !== today) {
            this.addPatience(3);
            this.lastDailyClaimDate = today;
        }
    }

    /**
     * Get milliseconds until next UTC midnight
     * @returns {number}
     */
    getMillisecondsUntilNextDaily() {
        const now = new Date();
        const tomorrow = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
            0, 0, 0, 0
        ));
        return tomorrow.getTime() - now.getTime();
    }

    /**
     * Update called each tick
     */
    update() {
        this.checkDailyPatience();
    }

    /**
     * Save patience manager state
     * @returns {Object} Serialized state
     */
    saveState() {
        return {
            currentHours: this.currentHours,
            lastDailyClaimDate: this.lastDailyClaimDate
        };
    }

    /**
     * Load patience manager state
     * @param {Object} data - Saved state data
     */
    loadState(data) {
        if (data.currentHours !== undefined) {
            this.currentHours = data.currentHours;
        }
        if (data.lastDailyClaimDate !== undefined) {
            this.lastDailyClaimDate = data.lastDailyClaimDate;
        }
    }

    /**
     * Reapply effects after loading or planet travel
     */
    reapplyEffects() {
        this.applyActiveEffects();
    }
}

try {
    window.PatienceManager = PatienceManager;
} catch (error) {
    // Ignore if window is unavailable (e.g., during tests)
}
try {
    if (module && module.exports) {
        module.exports = PatienceManager;
    }
} catch (error) {
    // Ignore when module is unavailable
}
