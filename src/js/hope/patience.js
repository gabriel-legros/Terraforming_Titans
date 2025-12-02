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

        // Get superalloy production rate (per second)
        const superalloyResource = resources?.colony?.superalloys;
        if (!superalloyResource) {
            return false;
        }

        const productionRate = superalloyResource.productionRate || 0;
        if (productionRate <= 0) {
            return false;
        }

        // Calculate superalloy gain: production rate * hours in seconds
        const secondsOfPatience = hours * 3600;
        const superalloyGain = productionRate * secondsOfPatience;

        // Deduct patience and add superalloy
        this.currentHours -= hours;
        superalloyResource.increase(superalloyGain, false);

        return true;
    }

    /**
     * Called when terraforming is completed
     */
    onTerraformingComplete() {
        if (this.enabled) {
            this.addPatience(2);
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
            this.addPatience(2);
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

if (typeof globalThis !== 'undefined') {
    globalThis.PatienceManager = PatienceManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatienceManager;
}