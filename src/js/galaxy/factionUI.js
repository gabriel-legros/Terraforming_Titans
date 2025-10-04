const GALAXY_FACTION_UI_UHF_KEY = globalThis.UHF_FACTION_ID || 'uhf';
const GALAXY_FACTION_UI_OPERATION_FALLBACK = Number.isFinite(globalThis.GALAXY_OPERATION_DURATION_MS)
    ? globalThis.GALAXY_OPERATION_DURATION_MS
    : 5 * 60 * 1000;

function sanitizeOperationDuration(operation) {
    const duration = Number(operation?.durationMs);
    if (Number.isFinite(duration) && duration > 0) {
        return duration;
    }
    return GALAXY_FACTION_UI_OPERATION_FALLBACK;
}

function sanitizeOperationElapsed(operation, duration) {
    const elapsed = Number(operation?.elapsedMs);
    if (!Number.isFinite(elapsed) || elapsed <= 0) {
        return 0;
    }
    if (elapsed >= duration) {
        return duration;
    }
    return elapsed;
}

function sanitizeOperationPower(operation) {
    const offense = Number(operation?.offensePower);
    if (Number.isFinite(offense) && offense > 0) {
        return offense;
    }
    const assigned = Number(operation?.assignedPower);
    if (Number.isFinite(assigned) && assigned > 0) {
        return assigned;
    }
    return 0;
}

function sanitizeReservedPower(operation) {
    const reserved = Number(operation?.reservedPower);
    if (Number.isFinite(reserved) && reserved > 0) {
        return reserved;
    }
    return undefined;
}

function extractAttacker(manager, factionId, cache) {
    if (!factionId) {
        return { faction: null, name: 'Unknown faction' };
    }
    if (cache.has(factionId)) {
        const cached = cache.get(factionId);
        return {
            faction: cached,
            name: cached?.name || 'Unknown faction'
        };
    }
    const faction = manager?.getFaction?.(factionId) || null;
    cache.set(factionId, faction);
    return {
        faction,
        name: faction?.name || 'Unknown faction'
    };
}

function extractIncomingAttacks(manager) {
    const sectors = manager?.getSectors?.() || [];
    const factionCache = new Map();
    const attacks = [];
    for (let index = 0; index < sectors.length; index += 1) {
        const sector = sectors[index];
        if (!sector) {
            continue;
        }
        const operation = manager?.getOperationForSector?.(sector.key);
        if (!operation || operation.status !== 'running') {
            continue;
        }
        const attackerId = operation.factionId;
        if (!attackerId || attackerId === GALAXY_FACTION_UI_UHF_KEY) {
            continue;
        }
        const uhfControl = Number(sector.getControlValue?.(GALAXY_FACTION_UI_UHF_KEY)) || 0;
        if (!(uhfControl > 0)) {
            continue;
        }
        const duration = sanitizeOperationDuration(operation);
        const elapsed = sanitizeOperationElapsed(operation, duration);
        const remaining = Math.max(0, duration - elapsed);
        const power = Math.max(0, sanitizeOperationPower(operation));
        const reservedPower = sanitizeReservedPower(operation);
        const attacker = extractAttacker(manager, attackerId, factionCache);
        const displayName = sector.getDisplayName?.();
        const sectorName = displayName || sector.key || 'Unknown sector';
        attacks.push({
            sectorKey: sector.key,
            sectorName,
            attackerId,
            attackerName: attacker.name,
            remainingMs: remaining,
            durationMs: duration,
            elapsedMs: elapsed,
            power,
            reservedPower,
            uhfControl
        });
    }

    attacks.sort((left, right) => {
        if (left.remainingMs !== right.remainingMs) {
            return left.remainingMs - right.remainingMs;
        }
        if (left.power !== right.power) {
            return right.power - left.power;
        }
        if (left.sectorName !== right.sectorName) {
            return left.sectorName.localeCompare(right.sectorName);
        }
        return left.sectorKey.localeCompare(right.sectorKey);
    });

    return attacks;
}

const GalaxyFactionUI = globalThis.GalaxyFactionUI || {};

GalaxyFactionUI.getIncomingAttacks = (manager) => extractIncomingAttacks(manager);

globalThis.GalaxyFactionUI = GalaxyFactionUI;

if (globalThis.module?.exports) {
    globalThis.module.exports = GalaxyFactionUI;
}
