const ATLAS_FEATURED_SEED_KEYS = ['wolfysnightmare', 'therealposeidon'];

function getAtlasSpecialSeedKey(source) {
    if (!source) {
        return null;
    }
    return source.specialSeedKey
        || source.rwgMeta?.specialSeedKey
        || source.merged?.rwgMeta?.specialSeedKey
        || source.override?.rwgMeta?.specialSeedKey
        || source.original?.merged?.rwgMeta?.specialSeedKey
        || null;
}

class AtlasManager extends EffectableEntity {
    constructor() {
        super({ description: 'Manages Atlas challenge worlds.' });
        this.enabled = false;
        this.atlasWorldCompletions = {};
    }

    getChallengeDefinitions() {
        const definitions = getAllSpecialSeedDefinitions();
        return definitions
            .filter((definition) => definition && definition.key)
            .sort((left, right) => {
                const leftFeatured = ATLAS_FEATURED_SEED_KEYS.includes(left.key);
                const rightFeatured = ATLAS_FEATURED_SEED_KEYS.includes(right.key);
                if (leftFeatured !== rightFeatured) {
                    return leftFeatured ? -1 : 1;
                }
                const leftIndex = ATLAS_FEATURED_SEED_KEYS.indexOf(left.key);
                const rightIndex = ATLAS_FEATURED_SEED_KEYS.indexOf(right.key);
                if (leftIndex !== rightIndex) {
                    return leftIndex - rightIndex;
                }
                return String(left.name || left.key).localeCompare(String(right.name || right.key));
            });
    }

    getFeaturedDefinitions() {
        return this.getChallengeDefinitions().filter((definition) => ATLAS_FEATURED_SEED_KEYS.includes(definition.key));
    }

    getFeaturedCompletionCount() {
        return this.getFeaturedDefinitions().reduce((count, definition) => (
            count + (this.isCompleted(definition.key) ? 1 : 0)
        ), 0);
    }

    getCommunityDefinitions() {
        return this.getChallengeDefinitions().filter((definition) => !ATLAS_FEATURED_SEED_KEYS.includes(definition.key) && definition.designer);
    }

    isChallengeSeedKey(seedKey) {
        if (!seedKey) {
            return false;
        }
        const resolved = String(seedKey).trim().toLowerCase();
        return this.getChallengeDefinitions().some((definition) => definition.key === resolved);
    }

    getCompletion(seedKey) {
        const resolved = String(seedKey || '').trim().toLowerCase();
        return this.atlasWorldCompletions[resolved] || { completed: false };
    }

    isCompleted(seedKey) {
        return this.getCompletion(seedKey).completed === true;
    }

    markCompleted(seedKey) {
        const resolved = String(seedKey || '').trim().toLowerCase();
        if (!resolved) {
            return;
        }
        const existing = this.getCompletion(resolved);
        if (existing.completed) {
            return;
        }
        this.atlasWorldCompletions[resolved] = {
            completed: true,
            completedAt: Date.now()
        };
        if (skillManager && typeof skillManager.handleAtlasCompletionChange === 'function') {
            skillManager.handleAtlasCompletionChange();
        }
        this.updateUI({ force: true });
    }

    getCurrentChallengeSeedKey() {
        const currentWorld = spaceManager.getCurrentWorldOriginal();
        const seedKey = getAtlasSpecialSeedKey(currentWorld);
        return this.isChallengeSeedKey(seedKey) ? seedKey : null;
    }

    syncCompletionsFromSpaceState() {
        const statuses = spaceManager.randomWorldStatuses || {};
        Object.keys(statuses).forEach((seed) => {
            const status = statuses[seed];
            const seedKey = getAtlasSpecialSeedKey(status) || getAtlasSpecialSeedKey(status?.original);
            if (status?.terraformed && this.isChallengeSeedKey(seedKey)) {
                this.markCompleted(seedKey);
            }
        });
        const currentSeedKey = this.getCurrentChallengeSeedKey();
        if (currentSeedKey && spaceManager.isCurrentWorldTerraformed()) {
            this.markCompleted(currentSeedKey);
        }
    }

    buildChallengeWorldResult(seedKey) {
        const definition = getSpecialSeedDefinition(seedKey);
        if (!definition) {
            return null;
        }
        const result = buildSpecialSeedWorldResult(definition.seed || seedKey, 0);
        if (result) {
            result.atlasChallenge = true;
        }
        return result;
    }

    travelToChallengeWorld(seedKey, options = {}) {
        const skipCurrentWorldWarnings = options.skipCurrentWorldWarnings === true;
        const definition = getSpecialSeedDefinition(seedKey);
        if (!definition) {
            return false;
        }
        if (spaceManager.isRandomTravelLocked()) {
            return false;
        }
        if (!skipCurrentWorldWarnings && handleCurrentWorldTravelWarnings(() => {
            this.travelToChallengeWorld(seedKey, { skipCurrentWorldWarnings: true });
        })) {
            return false;
        }
        const result = this.buildChallengeWorldResult(seedKey);
        if (!result) {
            return false;
        }
        return spaceManager.travelToRandomWorld(result, result.seedString || definition.seed || seedKey);
    }

    enable(targetId) {
        if (targetId && targetId !== 'space-atlas' && targetId !== 'atlas') {
            return;
        }
        if (this.enabled) {
            this.refreshUIVisibility();
            return;
        }
        this.enabled = true;
        this.refreshUIVisibility();
    }

    disable() {
        if (!this.enabled) {
            return;
        }
        this.enabled = false;
        this.refreshUIVisibility();
    }

    refreshUIVisibility() {
        if (this.enabled) {
            showSpaceAtlasTab();
        } else {
            hideSpaceAtlasTab();
        }
        this.updateUI({ force: true });
    }

    updateUI(options = {}) {
        if (typeof updateAtlasUI === 'function') {
            updateAtlasUI(options);
        }
    }

    update() {}

    reapplyEffects() {
        this.refreshUIVisibility();
    }

    applyEffect(effect) {
        if (!effect) {
            return;
        }
        if (effect.type === 'enable') {
            this.enable(effect.targetId || 'space-atlas');
            return;
        }
        if (effect.type === 'disable') {
            this.disable();
            return;
        }
        super.applyEffect(effect);
    }

    saveState() {
        return {
            enabled: this.enabled,
            atlasWorldCompletions: this.atlasWorldCompletions
        };
    }

    loadState(state) {
        this.enabled = state?.enabled === true;
        this.atlasWorldCompletions = {};
        const savedCompletions = state?.atlasWorldCompletions || {};
        Object.keys(savedCompletions).forEach((seedKey) => {
            const normalized = String(seedKey).trim().toLowerCase();
            if (normalized) {
                this.atlasWorldCompletions[normalized] = savedCompletions[seedKey];
            }
        });
        this.syncCompletionsFromSpaceState();
        this.refreshUIVisibility();
    }
}

if (typeof window !== 'undefined') {
    window.AtlasManager = AtlasManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AtlasManager,
        ATLAS_FEATURED_SEED_KEYS,
        getAtlasSpecialSeedKey
    };
}
