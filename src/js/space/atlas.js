const ATLAS_FEATURED_SEED_KEYS = ['hermes', 'titania', 'therealposeidon', 'wolfysnightmare'];
const ATLAS_COMMUNITY_COMPLETION_ARTIFACT_REWARD = 1000;

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

    isCommunityChallengeSeedKey(seedKey) {
        if (!seedKey) {
            return false;
        }
        const resolved = String(seedKey).trim().toLowerCase();
        return this.getCommunityDefinitions().some((definition) => definition.key === resolved);
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

    updateFastestCompletion(seedKey, playSeconds, realSeconds) {
        const resolved = String(seedKey || '').trim().toLowerCase();
        if (!resolved) {
            return false;
        }
        const completion = this.getCompletion(resolved);
        const bestPlaySeconds = Number(completion.fastestCompletionDays);
        const bestRealSeconds = Number(completion.fastestCompletionRealSeconds);
        const nextPlaySeconds = Number(playSeconds);
        const nextRealSeconds = Number(realSeconds);
        if (!Number.isFinite(nextPlaySeconds) || nextPlaySeconds < 0) {
            return false;
        }
        const hasExistingBest = Number.isFinite(bestPlaySeconds) && bestPlaySeconds >= 0;
        const missingExistingReal = !Number.isFinite(bestRealSeconds) || bestRealSeconds < 0;
        const hasNextReal = Number.isFinite(nextRealSeconds) && nextRealSeconds >= 0;
        const shouldUpdate = !hasExistingBest
            || nextPlaySeconds < bestPlaySeconds
            || (nextPlaySeconds === bestPlaySeconds && missingExistingReal && hasNextReal)
            || (nextPlaySeconds === bestPlaySeconds && hasNextReal && nextRealSeconds < bestRealSeconds);
        if (!shouldUpdate) {
            return false;
        }
        completion.fastestCompletionDays = nextPlaySeconds;
        completion.fastestCompletionRealSeconds = hasNextReal ? nextRealSeconds : null;
        this.atlasWorldCompletions[resolved] = completion;
        return true;
    }

    isCompleted(seedKey) {
        return this.getCompletion(seedKey).completed === true;
    }

    getCompletionRewards(seedKey) {
        const definition = getSpecialSeedDefinition(seedKey);
        const rewards = Array.isArray(definition?.completionRewards) ? definition.completionRewards : [];
        return rewards.filter((reward) => reward && reward.id);
    }

    applyCompletionRewards() {
        this.getChallengeDefinitions().forEach((definition) => {
            const seedKey = definition?.key;
            if (!seedKey) {
                return;
            }
            const sourceId = `atlas-reward-${seedKey}`;
            this.getCompletionRewards(seedKey).forEach((reward, rewardIndex) => {
                const effects = Array.isArray(reward.effects) ? reward.effects : [];
                effects.forEach((effect, effectIndex) => {
                    const rewardEffect = {
                        ...effect,
                        effectId: effect.effectId || `${sourceId}-${reward.id}-${effectIndex}`,
                        sourceId
                    };
                    removeEffect(rewardEffect);
                    if (this.isCompleted(seedKey)) {
                        addEffect(rewardEffect);
                    }
                });
            });
        });
        if (typeof updateRandomWorldUI === 'function') {
            updateRandomWorldUI();
        }
    }

    grantCommunityCompletionArtifactReward(seedKey) {
        const resolved = String(seedKey || '').trim().toLowerCase();
        if (!resolved || !this.isCommunityChallengeSeedKey(resolved)) {
            return 0;
        }
        const existing = this.getCompletion(resolved);
        if (existing.communityArtifactRewardGranted) {
            return 0;
        }
        resources.special.alienArtifact.increase(ATLAS_COMMUNITY_COMPLETION_ARTIFACT_REWARD);
        existing.communityArtifactRewardGranted = true;
        this.atlasWorldCompletions[resolved] = existing;
        return ATLAS_COMMUNITY_COMPLETION_ARTIFACT_REWARD;
    }

    markCompleted(seedKey, options = {}) {
        const resolved = String(seedKey || '').trim().toLowerCase();
        if (!resolved) {
            return;
        }
        const shouldUpdateFastest = options.skipFastestUpdate !== true;
        let changed = false;
        if (shouldUpdateFastest) {
            changed = this.updateFastestCompletion(resolved, playTimeSeconds, realPlayTimeSeconds) || changed;
        }
        const existing = this.atlasWorldCompletions[resolved] || this.getCompletion(resolved);
        if (!existing.completed) {
            existing.completed = true;
            existing.completedAt = Date.now();
            this.atlasWorldCompletions[resolved] = existing;
            this.grantCommunityCompletionArtifactReward(resolved);
            this.applyCompletionRewards();
            if (skillManager && typeof skillManager.handleAtlasCompletionChange === 'function') {
                skillManager.handleAtlasCompletionChange();
            }
            changed = true;
        }
        if (changed) {
            this.updateUI({ force: true });
        }
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
                this.markCompleted(seedKey, { skipFastestUpdate: true });
            }
        });
        const currentSeedKey = this.getCurrentChallengeSeedKey();
        if (currentSeedKey && spaceManager.isCurrentWorldTerraformed()) {
            this.markCompleted(currentSeedKey, { skipFastestUpdate: true });
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
        this.applyCompletionRewards();
        if (skillManager && typeof skillManager.handleAtlasCompletionChange === 'function') {
            skillManager.handleAtlasCompletionChange();
        }
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
                const savedCompletion = savedCompletions[seedKey] || {};
                const normalizedCompletion = {
                    ...savedCompletion,
                    completed: savedCompletion.completed === true
                };
                const fastestCompletionDays = Number(savedCompletion.fastestCompletionDays);
                normalizedCompletion.fastestCompletionDays = Number.isFinite(fastestCompletionDays) && fastestCompletionDays > 0
                    ? fastestCompletionDays
                    : null;
                const fastestCompletionRealSeconds = Number(savedCompletion.fastestCompletionRealSeconds);
                normalizedCompletion.fastestCompletionRealSeconds = Number.isFinite(fastestCompletionRealSeconds) && fastestCompletionRealSeconds > 0
                    ? fastestCompletionRealSeconds
                    : null;
                this.atlasWorldCompletions[normalized] = normalizedCompletion;
            }
        });
        this.syncCompletionsFromSpaceState();
        Object.keys(this.atlasWorldCompletions).forEach((seedKey) => {
            const completion = this.atlasWorldCompletions[seedKey];
            if (completion?.completed) {
                this.grantCommunityCompletionArtifactReward(seedKey);
            }
        });
        this.reapplyEffects();
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
