const HEX_RADIUS = 6;
const HEX_BASE_SIZE = 44;
const HEX_TILE_SCALE = 0.94;
const HEX_MIN_SCALE = 0.3;
const HEX_MAX_SCALE = 2.5;
const HEX_SCALE_STEP = 1.25;
const SQRT3 = Math.sqrt(3);
const INITIAL_FOCUS_SECTOR = 'R5-07';
const HEX_STRIPE_BASE_WIDTH = 40;
const HEX_STRIPE_MIN_WIDTH = 4;
const HEX_STRIPE_ANGLE = 135;
const HEX_STRIPE_BASE_LIGHTEN = 0.14;
const HEX_STRIPE_HOVER_LIGHTEN = 0.26;
const HEX_BORDER_LIGHTEN = 0.32;
const GALAXY_UHF_FACTION_ID = 'uhf';
const GALAXY_DEFENSE_ICON = '\u{1F6E1}\u{FE0F}';
const FLEET_VALUE_FORMATTER = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
});
const GALAXY_DEFENSE_INT_FORMATTER = (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function')
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
    : null;
const GALAXY_ALIEN_ICON = '\u2620\uFE0F';
const GALAXY_CONTROL_EPSILON = 1e-6;
const PAN_ACTIVATION_DISTANCE = 6;
const PAN_ACTIVATION_DISTANCE_SQUARED = PAN_ACTIVATION_DISTANCE * PAN_ACTIVATION_DISTANCE;
const OPERATION_COST_PER_POWER = 1000;
const OPERATION_DURATION_FALLBACK_MS = 10000;
const UHF_FACTION_KEY = (typeof globalThis !== 'undefined' && typeof globalThis.UHF_FACTION_ID === 'string')
    ? globalThis.UHF_FACTION_ID
    : 'uhf';
const GALAXY_UI_FLEET_UPGRADE_INCREMENT = (typeof globalThis !== 'undefined' && typeof globalThis.GALAXY_FLEET_UPGRADE_INCREMENT === 'number')
    ? globalThis.GALAXY_FLEET_UPGRADE_INCREMENT
    : 0.1;
const FLEET_UPGRADE_FALLBACKS = [
    {
        key: 'militaryResearch',
        label: 'Military R&D',
        description: 'Channel advanced research into hangar expansions that squeeze in additional wings.',
        costLabel: 'Advanced Research'
    },
    {
        key: 'micOutsource',
        label: 'MIC Outsource',
        description: 'Cut Solis a check so they can subcontract extra yards for the fleet.',
        costLabel: 'Solis Points'
    },
    {
        key: 'enemyLessons',
        label: 'Reverse Engineering',
        description: 'Reverse-engineer alien tactics and fold their tricks into UHF logistics.',
        costLabel: 'Alien Artifacts'
    },
    {
        key: 'pandoraBox',
        label: "PANDORA'S Box",
        description: 'Spend a skill point to greenlight unconventional fleet experiments.',
        costLabel: 'Skill Points'
    }
];

const operationsAllocations = new Map();
const operationsStepSizes = new Map();

let galaxyUICache = null;
const supportsPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;
let legacyPanAttached = false;

function formatFleetValue(value) {
    if (!Number.isFinite(value)) {
        return '0';
    }
    const normalized = value < 0 ? 0 : value;
    return FLEET_VALUE_FORMATTER.format(normalized);
}

function formatFleetMultiplier(value) {
    if (!Number.isFinite(value) || value <= 0) {
        return '1.00';
    }
    const rounded = Math.round(value * 100) / 100;
    return rounded.toFixed(2);
}

function formatFleetUpgradeCost(value) {
    if (!Number.isFinite(value) || value <= 0) {
        return '0';
    }
    const formatter = globalThis?.formatNumber;
    if (formatter) {
        return formatter(value, true, value < 1000 ? 2 : 0);
    }
    return value.toLocaleString('en-US');
}

function getSectorUhfControl(sector) {
    if (!sector) {
        return 0;
    }
    const direct = sector.getControlValue?.(UHF_FACTION_KEY);
    if (Number.isFinite(direct) && direct > 0) {
        return direct;
    }
    const fallback = sector.control?.[UHF_FACTION_KEY];
    const numericFallback = Number(fallback);
    if (Number.isFinite(numericFallback) && numericFallback > 0) {
        return numericFallback;
    }
    return 0;
}

function normalizeHexColor(color) {
    if (!color) {
        return null;
    }
    const trimmed = color.trim();
    if (!trimmed || trimmed[0] !== '#') {
        return null;
    }
    if (trimmed.length === 4) {
        return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    if (trimmed.length === 7) {
        return trimmed;
    }
    return null;
}

function hexToRgb(color) {
    const normalized = normalizeHexColor(color);
    if (!normalized) {
        return null;
    }
    const red = parseInt(normalized.slice(1, 3), 16);
    const green = parseInt(normalized.slice(3, 5), 16);
    const blue = parseInt(normalized.slice(5, 7), 16);
    if (!Number.isFinite(red) || !Number.isFinite(green) || !Number.isFinite(blue)) {
        return null;
    }
    return { r: red, g: green, b: blue };
}

function rgbToCss(rgb) {
    const red = Math.round(rgb.r);
    const green = Math.round(rgb.g);
    const blue = Math.round(rgb.b);
    return `rgb(${red}, ${green}, ${blue})`;
}

function lightenColor(color, weight) {
    const rgb = hexToRgb(color);
    if (!rgb) {
        return color;
    }
    const clamped = Math.max(0, Math.min(1, weight));
    const blended = {
        r: rgb.r + ((255 - rgb.r) * clamped),
        g: rgb.g + ((255 - rgb.g) * clamped),
        b: rgb.b + ((255 - rgb.b) * clamped)
    };
    return rgbToCss(blended);
}

function createStripeBackground(primaryColor, secondaryColor, primaryValue, secondaryValue, lightenAmount) {
    const total = primaryValue + secondaryValue;
    if (!(total > 0) || !(secondaryValue > 0)) {
        return null;
    }
    const secondaryRatio = Math.max(0, Math.min(secondaryValue / total, 0.5));
    const primaryRatio = 1 - secondaryRatio;
    const primaryWidth = Math.max(HEX_STRIPE_MIN_WIDTH, Math.round(primaryRatio * HEX_STRIPE_BASE_WIDTH));
    const secondaryWidth = Math.max(HEX_STRIPE_MIN_WIDTH, Math.round(secondaryRatio * HEX_STRIPE_BASE_WIDTH));
    const cycleEnd = primaryWidth + secondaryWidth;
    const primaryShade = lightenColor(primaryColor, lightenAmount);
    const secondaryShade = lightenColor(secondaryColor, lightenAmount);
    return `repeating-linear-gradient(${HEX_STRIPE_ANGLE}deg, ${primaryShade} 0px, ${primaryShade} ${primaryWidth}px, ${secondaryShade} ${primaryWidth}px, ${secondaryShade} ${cycleEnd}px)`;
}

function createFactionStripeStyles(primaryColor, secondaryColor, primaryValue, secondaryValue) {
    const background = createStripeBackground(primaryColor, secondaryColor, primaryValue, secondaryValue, HEX_STRIPE_BASE_LIGHTEN);
    if (!background) {
        return null;
    }
    const hoverBackground = createStripeBackground(primaryColor, secondaryColor, primaryValue, secondaryValue, HEX_STRIPE_HOVER_LIGHTEN) || background;
    const borderColor = lightenColor(primaryColor, HEX_BORDER_LIGHTEN);
    return {
        background,
        hoverBackground,
        borderColor
    };
}

function getHexDimensions(size) {
    return {
        width: size * SQRT3,
        height: size * 2
    };
}

function getHexDistance(q, r) {
    const s = -q - r;
    return Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
}

function getRingIndex(q, r, ring) {
    if (ring === 0) {
        return 0;
    }
    let currentQ = ring;
    let currentR = 0;
    let index = 0;
    if (currentQ === q && currentR === r) {
        return index;
    }
    const directions = [
        { q: 0, r: -1 },
        { q: -1, r: 0 },
        { q: -1, r: 1 },
        { q: 0, r: 1 },
        { q: 1, r: 0 },
        { q: 1, r: -1 }
    ];
    for (let side = 0; side < directions.length; side += 1) {
        const dir = directions[side];
        for (let step = 0; step < ring; step += 1) {
            currentQ += dir.q;
            currentR += dir.r;
            index += 1;
            if (currentQ === q && currentR === r) {
                return index;
            }
        }
    }
    return index % (ring * 6);
}

function formatSectorName(q, r) {
    const ring = getHexDistance(q, r);
    if (ring === 0) {
        return 'Core';
    }
    const index = getRingIndex(q, r, ring);
    const ringSize = ring * 6;
    const digits = Math.max(2, String(ringSize).length);
    return `R${ring}-${String(index + 1).padStart(digits, '0')}`;
}

function createHexGridData(radius, size) {
    const hexes = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let q = -radius; q <= radius; q += 1) {
        const rMin = Math.max(-radius, -q - radius);
        const rMax = Math.min(radius, -q + radius);
        for (let r = rMin; r <= rMax; r += 1) {
            const x = size * SQRT3 * (q + (r / 2));
            const y = size * 1.5 * r;
            minX = x < minX ? x : minX;
            maxX = x > maxX ? x : maxX;
            minY = y < minY ? y : minY;
            maxY = y > maxY ? y : maxY;
            hexes.push({ q, r, x, y });
        }
    }

    const { width: hexWidth, height: hexHeight } = getHexDimensions(size);
    return {
        hexes,
        minX,
        maxX,
        minY,
        maxY,
        width: (maxX - minX) + hexWidth,
        height: (maxY - minY) + hexHeight
    };
}

function createGalaxyHex(doc, { q, r, x, y, displayName }, size, offsets) {
    const scaledSize = size * HEX_TILE_SCALE;
    const { width: displayWidth, height: displayHeight } = getHexDimensions(scaledSize);
    const hex = doc.createElement('button');
    hex.className = 'galaxy-hex';
    hex.type = 'button';
    hex.dataset.q = q;
    hex.dataset.r = r;
    const sectorName = displayName || formatSectorName(q, r);
    hex.setAttribute('aria-label', sectorName === 'Core' ? 'Core sector' : `Sector ${sectorName}`);
    hex.dataset.displayName = sectorName;
    hex.style.width = `${displayWidth}px`;
    hex.style.height = `${displayHeight}px`;
    const left = Math.round(x + offsets.x - (displayWidth / 2));
    const top = Math.round(y + offsets.y - (displayHeight / 2));
    hex.style.left = `${left}px`;
    hex.style.top = `${top}px`;

    const defense = doc.createElement('span');
    defense.className = 'galaxy-hex__defense';
    hex.appendChild(defense);
    hex.galaxyDefenseElement = defense;

    const label = doc.createElement('span');
    label.className = 'galaxy-hex__label';
    label.textContent = sectorName;
    hex.appendChild(label);

    return hex;
}

function handleGalaxyHexClick(event) {
    if (galaxyUICache && galaxyUICache.mapState && galaxyUICache.mapState.preventNextClick) {
        galaxyUICache.mapState.preventNextClick = false;
        if (event && event.preventDefault) {
            event.preventDefault();
        }
        if (event && event.stopPropagation) {
            event.stopPropagation();
        }
        return;
    }
    const hex = event.currentTarget;
    if (!hex) {
        return;
    }
    const q = Number(hex.dataset.q);
    const r = Number(hex.dataset.r);
    if (!Number.isFinite(q) || !Number.isFinite(r)) {
        return;
    }
    selectGalaxySector({ q, r, hex });
}

function selectGalaxySector({ q, r, hex }) {
    if (!galaxyUICache) {
        return;
    }
    const manager = galaxyManager;
    if (!manager || !manager.enabled) {
        clearSelectedGalaxySector();
        return;
    }
    const sector = manager.getSector(q, r);
    if (!sector) {
        return;
    }

    if (galaxyUICache.selectedHex && galaxyUICache.selectedHex !== hex) {
        galaxyUICache.selectedHex.classList.remove('is-selected');
    }
    if (hex) {
        hex.classList.add('is-selected');
    }

    galaxyUICache.selectedHex = hex || null;
    galaxyUICache.selectedSector = {
        q,
        r,
        key: `${q},${r}`,
        displayName: hex && hex.dataset.displayName ? hex.dataset.displayName : formatSectorName(q, r)
    };

    renderSelectedSectorDetails();
}

function clearSelectedGalaxySector() {
    if (!galaxyUICache) {
        return;
    }
    if (galaxyUICache.selectedHex) {
        galaxyUICache.selectedHex.classList.remove('is-selected');
    }
    galaxyUICache.selectedHex = null;
    galaxyUICache.selectedSector = null;

    const panel = galaxyUICache.sectorContent;
    if (!panel) {
        return;
    }
    const message = panel.dataset.emptyMessage || 'No sector selected.';
    panel.classList.remove('is-populated');
    panel.replaceChildren();
    panel.textContent = message;

    updateOperationsPanel();
}

function getNumberFormatter() {
    if (typeof formatNumber === 'function') {
        return formatNumber;
    }
    return (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return '0';
        }
        return Math.round(numeric * 100) / 100;
    };
}

function getSelectedSectorKey() {
    if (!galaxyUICache || !galaxyUICache.selectedSector) {
        return null;
    }
    return galaxyUICache.selectedSector.key || null;
}

function getStoredAllocation(key) {
    if (!key || !operationsAllocations.has(key)) {
        return 0;
    }
    const value = operationsAllocations.get(key);
    return Number.isFinite(value) ? value : 0;
}

function setStoredAllocation(key, value) {
    if (!key) {
        return;
    }
    if (!Number.isFinite(value) || value <= 0) {
        operationsAllocations.delete(key);
        return;
    }
    operationsAllocations.set(key, value);
}

function getStoredStep(key) {
    if (!key || !operationsStepSizes.has(key)) {
        return 1;
    }
    const value = operationsStepSizes.get(key);
    if (!Number.isFinite(value) || value <= 0) {
        return 1;
    }
    return value;
}

function setStoredStep(key, value) {
    if (!key) {
        return;
    }
    if (!Number.isFinite(value) || value <= 0) {
        operationsStepSizes.delete(key);
        return;
    }
    operationsStepSizes.set(key, value);
}

function updateOperationsStepDisplay(step, formatter) {
    if (!galaxyUICache || !galaxyUICache.operationsButtons) {
        return;
    }
    const formatted = formatter ? formatter(step, true, 0) : step;
    const buttons = galaxyUICache.operationsButtons;
    if (buttons.decrement) {
        buttons.decrement.textContent = `-${formatted}`;
    }
    if (buttons.increment) {
        buttons.increment.textContent = `+${formatted}`;
    }
}

function getHexNeighborDirections() {
    if (typeof globalThis !== 'undefined' && Array.isArray(globalThis.__galaxyNeighborDirections)) {
        return globalThis.__galaxyNeighborDirections;
    }
    const directions = Object.freeze([
        { q: 1, r: 0 },
        { q: 1, r: -1 },
        { q: 0, r: -1 },
        { q: -1, r: 0 },
        { q: -1, r: 1 },
        { q: 0, r: 1 }
    ]);
    if (typeof globalThis !== 'undefined') {
        globalThis.__galaxyNeighborDirections = directions;
    }
    return directions;
}

function isUhfFullControlSector(sector) {
    if (!sector) {
        return false;
    }
    const totalControl = typeof sector.getTotalControlValue === 'function'
        ? sector.getTotalControlValue()
        : Object.values(sector.control || {}).reduce((sum, value) => {
            const numeric = Number(value);
            if (!Number.isFinite(numeric) || numeric <= 0) {
                return sum;
            }
            return sum + numeric;
        }, 0);
    if (!(totalControl > 0)) {
        return false;
    }
    let uhfControl = 0;
    if (typeof sector.getControlValue === 'function') {
        uhfControl = sector.getControlValue(UHF_FACTION_KEY) || 0;
    } else if (sector.control && Object.prototype.hasOwnProperty.call(sector.control, UHF_FACTION_KEY)) {
        uhfControl = Number(sector.control[UHF_FACTION_KEY]) || 0;
    }
    const epsilon = 1e-6;
    return Math.abs(uhfControl - totalControl) <= epsilon;
}

function hasNeighboringUhfStronghold(manager, q, r) {
    if (!manager) {
        return false;
    }
    if (typeof manager.hasUhfNeighboringStronghold === 'function') {
        return manager.hasUhfNeighboringStronghold(q, r);
    }
    if (!Number.isFinite(q) || !Number.isFinite(r)) {
        return false;
    }
    if (typeof manager.getSector !== 'function') {
        return false;
    }
    const directions = getHexNeighborDirections();
    for (let index = 0; index < directions.length; index += 1) {
        const direction = directions[index];
        const neighbor = manager.getSector(q + direction.q, r + direction.r);
        if (isUhfFullControlSector(neighbor)) {
            return true;
        }
    }
    return false;
}

function clampAssignment(value, maxAssignable) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return 0;
    }
    if (!Number.isFinite(maxAssignable) || maxAssignable <= 0) {
        return 0;
    }
    if (numeric > maxAssignable) {
        return maxAssignable;
    }
    return numeric;
}

function computeSuccessChance(assignedPower, defensePower) {
    const offense = Number(assignedPower);
    if (!Number.isFinite(offense) || offense <= 0) {
        return 0;
    }
    const defense = Number(defensePower);
    if (!Number.isFinite(defense) || defense <= 0) {
        return 1;
    }
    const total = offense + defense;
    if (!(total > 0)) {
        return 0;
    }
    return Math.max(0, Math.min(1, offense / total));
}

function computeSuccessfulLoss(assignedPower, defensePower) {
    const offense = Number(assignedPower);
    const defense = Number(defensePower);
    if (!Number.isFinite(offense) || offense <= 0) {
        return 0;
    }
    if (!Number.isFinite(defense) || defense <= 0) {
        return 0;
    }
    return Math.min(offense, (defense * defense) / (offense + defense));
}

function formatPercentDisplay(value) {
    const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
    return `${percent}%`;
}

function handleOperationsInputChange(event) {
    const key = getSelectedSectorKey();
    if (!key) {
        return;
    }
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) {
        setStoredAllocation(key, 0);
    } else {
        setStoredAllocation(key, Math.max(0, value));
    }
    updateOperationsPanel();
}

function adjustAllocationByAction(action) {
    const manager = galaxyManager;
    const key = getSelectedSectorKey();
    if (!manager || !manager.enabled || !key || !galaxyUICache || !galaxyUICache.selectedSector) {
        return;
    }
    const faction = manager.getFaction(UHF_FACTION_KEY);
    const availablePower = faction ? Math.max(0, faction.fleetPower) : 0;
    let current = getStoredAllocation(key);
    let step = getStoredStep(key);
    let shouldUpdateAllocation = true;
    switch (action) {
    case 'zero':
        current = 0;
        break;
    case 'decrement':
        current = Math.max(0, current - step);
        break;
    case 'increment':
        current += step;
        break;
    case 'max':
        current = availablePower;
        break;
    case 'divide':
        if (step > 1) {
            const reduced = step / 10;
            step = reduced >= 1 ? Math.floor(reduced) : 1;
        } else {
            step = 1;
        }
        setStoredStep(key, step);
        shouldUpdateAllocation = false;
        break;
    case 'multiply':
        step *= 10;
        setStoredStep(key, step);
        shouldUpdateAllocation = false;
        break;
    default:
        break;
    }
    if (shouldUpdateAllocation) {
        const clamped = clampAssignment(current, availablePower);
        setStoredAllocation(key, clamped);
    }
    updateOperationsPanel();
}

function handleOperationsButtonClick(event) {
    const action = event.currentTarget && event.currentTarget.dataset ? event.currentTarget.dataset.action : '';
    if (!action) {
        return;
    }
    adjustAllocationByAction(action);
}

function handleOperationsLaunch() {
    const manager = galaxyManager;
    if (!manager || !manager.enabled || !galaxyUICache || !galaxyUICache.selectedSector) {
        return;
    }
    const selection = galaxyUICache.selectedSector;
    const sectorKey = selection.key;
    const sector = manager.getSector(selection.q, selection.r);
    if (!sectorKey || !sector) {
        return;
    }
    const faction = manager.getFaction(UHF_FACTION_KEY);
    if (!faction) {
        return;
    }
    const availablePower = Math.max(0, faction.fleetPower);
    const stored = getStoredAllocation(sectorKey);
    const assignment = clampAssignment(stored, availablePower);
    if (!(assignment > 0)) {
        return;
    }
    const antimatterResource = resources && resources.special ? resources.special.antimatter : null;
    const antimatterValue = antimatterResource ? Number(antimatterResource.value) : 0;
    const defensePower = manager.getSectorDefensePower(sectorKey, UHF_FACTION_KEY);
    const successChance = computeSuccessChance(assignment, defensePower);
    const cost = assignment * OPERATION_COST_PER_POWER;
    if (!antimatterResource || antimatterValue < cost) {
        return;
    }
    const operation = manager.startOperation({
        sectorKey,
        factionId: UHF_FACTION_KEY,
        assignedPower: assignment,
        successChance,
        durationMs: OPERATION_DURATION_FALLBACK_MS
    });
    if (!operation) {
        return;
    }
    if (antimatterResource) {
        antimatterResource.value = Math.max(0, antimatterValue - cost);
    }
    operation.launchCost = cost;
    setStoredAllocation(sectorKey, assignment);
    updateOperationsPanel();
}

function handleFleetUpgradePurchase(event) {
    const button = event?.currentTarget;
    const upgradeKey = button?.dataset?.upgrade;
    const manager = galaxyManager;
    if (!upgradeKey || !manager?.purchaseFleetUpgrade) {
        return;
    }
    if (!manager.purchaseFleetUpgrade(upgradeKey)) {
        return;
    }
    updateGalaxyUI();
}

function handleSectorLockToggle() {
    const details = galaxyUICache?.sectorDetails;
    if (!details) {
        return;
    }
    const lockInput = details.lockInput;
    const managerRef = globalThis.spaceManager;
    const currentSelection = galaxyUICache?.selectedSector?.displayName || '';
    const label = String(currentSelection).trim();
    const manager = galaxyManager;
    const selection = galaxyUICache?.selectedSector || null;
    const sector = selection && manager ? manager.getSector(selection.q, selection.r) : null;
    const uhfControl = getSectorUhfControl(sector);

    if (!managerRef || !label || uhfControl <= 0) {
        if (lockInput.checked && uhfControl <= 0) {
            lockInput.checked = false;
        }
        if (managerRef?.clearRwgSectorLock) {
            managerRef.clearRwgSectorLock();
        } else {
            managerRef?.setRwgSectorLock?.(null);
        }
        renderSelectedSectorDetails();
        return;
    }

    if (lockInput.checked) {
        managerRef.setRwgSectorLock?.(label);
    } else if (managerRef.getRwgSectorLock?.() === label) {
        if (managerRef.clearRwgSectorLock) {
            managerRef.clearRwgSectorLock();
        } else {
            managerRef.setRwgSectorLock?.(null);
        }
    }

    renderSelectedSectorDetails();
}

function renderSelectedSectorDetails() {
    if (!galaxyUICache) {
        return;
    }
    const panel = galaxyUICache.sectorContent;
    if (!panel) {
        return;
    }
    const selection = galaxyUICache.selectedSector;
    const manager = galaxyManager;
    if (!selection || !manager || !manager.enabled) {
        clearSelectedGalaxySector();
        return;
    }

    const sector = manager.getSector(selection.q, selection.r);
    if (!sector) {
        clearSelectedGalaxySector();
        return;
    }

    const doc = panel.ownerDocument || globalThis.document;
    if (!doc) {
        return;
    }

    const breakdown = [];
    const entries = Object.entries(sector.control);
    for (let index = 0; index < entries.length; index += 1) {
        const [factionId, rawValue] = entries[index];
        const value = Number(rawValue);
        if (!Number.isFinite(value) || value <= 0) {
            continue;
        }
        const faction = manager.getFaction(factionId);
        const name = faction && faction.name ? faction.name : factionId;
        breakdown.push({ factionId, name, value });
    }

    breakdown.sort((a, b) => {
        if (a.value === b.value) {
            return a.name.localeCompare(b.name);
        }
        return b.value - a.value;
    });

    const selectionLabel = String(selection.displayName || '').trim();
    let details = galaxyUICache.sectorDetails;
    if (!details) {
        const container = doc.createElement('div');
        container.className = 'galaxy-sector-panel__details';

        const title = doc.createElement('div');
        title.className = 'galaxy-sector-panel__title';
        container.appendChild(title);

        const powerContainer = doc.createElement('div');
        powerContainer.className = 'galaxy-sector-panel__stat';

        const powerLabel = doc.createElement('span');
        powerLabel.className = 'galaxy-sector-panel__stat-label';
        powerLabel.textContent = 'Power';
        powerContainer.appendChild(powerLabel);

        const powerValue = doc.createElement('span');
        powerValue.className = 'galaxy-sector-panel__stat-value';
        powerContainer.appendChild(powerValue);

        container.appendChild(powerContainer);

        const worldCountContainer = doc.createElement('div');
        worldCountContainer.className = 'galaxy-sector-panel__stat';

        const worldCountLabel = doc.createElement('span');
        worldCountLabel.className = 'galaxy-sector-panel__stat-label';
        worldCountLabel.textContent = 'Worlds';
        worldCountContainer.appendChild(worldCountLabel);

        const worldCountValue = doc.createElement('span');
        worldCountValue.className = 'galaxy-sector-panel__stat-value';
        worldCountContainer.appendChild(worldCountValue);

        container.appendChild(worldCountContainer);

        const lockOption = doc.createElement('label');
        lockOption.className = 'galaxy-sector-panel__lock-option';

        const lockInput = doc.createElement('input');
        lockInput.type = 'checkbox';
        lockInput.className = 'galaxy-sector-panel__lock-checkbox';
        lockInput.addEventListener('change', handleSectorLockToggle);

        const lockText = doc.createElement('span');
        lockText.className = 'galaxy-sector-panel__lock-label';
        lockText.textContent = 'Limit RWG to this sector';

        lockOption.appendChild(lockInput);
        lockOption.appendChild(lockText);

        container.appendChild(lockOption);

        const subtitle = doc.createElement('div');
        subtitle.className = 'galaxy-sector-panel__subtitle';
        subtitle.textContent = 'Faction Control';
        container.appendChild(subtitle);

        const list = doc.createElement('ul');
        list.className = 'galaxy-sector-panel__control-list';
        container.appendChild(list);

        const empty = doc.createElement('p');
        empty.className = 'galaxy-sector-panel__empty';
        empty.textContent = 'No factions currently control this sector.';
        container.appendChild(empty);

        panel.replaceChildren(container);

        details = {
            container,
            title,
            powerValue,
            worldCountValue,
            lockOption,
            lockInput,
            subtitle,
            list,
            empty
        };
        galaxyUICache.sectorDetails = details;
    } else if (!panel.contains(details.container)) {
        panel.replaceChildren(details.container);
    }

    const numberFormatter = globalThis.formatNumber || ((value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return '0';
        }
        return Math.round(numeric * 100) / 100;
    });

    const sectorPower = sector.getValue();
    details.title.textContent = selection.displayName === 'Core'
        ? 'Core Sector'
        : `Sector ${selection.displayName}`;
    details.powerValue.textContent = numberFormatter(sectorPower, true);

    const spaceManagerInstance = globalThis.spaceManager;
    const worldCount = spaceManagerInstance?.getWorldCountPerSector
        ? spaceManagerInstance.getWorldCountPerSector(selectionLabel)
        : 0;
    details.worldCountValue.textContent = numberFormatter(worldCount, true, 0);

    const lockAvailable = !!spaceManagerInstance?.setRwgSectorLock;
    details.lockOption.classList.toggle('is-hidden', !lockAvailable);
    if (lockAvailable) {
        const lockedValue = spaceManagerInstance.getRwgSectorLock?.() || '';
        const normalizedLocked = String(lockedValue).trim();
        const uhfControl = getSectorUhfControl(sector);
        const lockable = selectionLabel !== '' && uhfControl > 0;
        if (!lockable && normalizedLocked !== '') {
            const matchesSelection = normalizedLocked === selectionLabel;
            if (matchesSelection) {
                if (spaceManagerInstance.clearRwgSectorLock) {
                    spaceManagerInstance.clearRwgSectorLock();
                } else {
                    spaceManagerInstance.setRwgSectorLock?.(null);
                }
            }
        }
        const updatedLockedValue = spaceManagerInstance.getRwgSectorLock?.() || '';
        const normalizedUpdated = String(updatedLockedValue).trim();
        details.lockInput.checked = lockable && normalizedUpdated !== '' && normalizedUpdated === selectionLabel;
        details.lockInput.disabled = !lockable;
    } else {
        details.lockInput.checked = false;
        details.lockInput.disabled = true;
    }

    if (breakdown.length === 0) {
        details.subtitle.classList.add('is-hidden');
        details.list.replaceChildren();
        details.list.classList.add('is-hidden');
        details.empty.classList.remove('is-hidden');
    } else {
        let total = 0;
        for (let index = 0; index < breakdown.length; index += 1) {
            total += breakdown[index].value;
        }

        const fragment = doc.createDocumentFragment();
        breakdown.forEach((entry) => {
            const item = doc.createElement('li');
            item.className = 'galaxy-sector-panel__control-item';

            const name = doc.createElement('span');
            name.className = 'galaxy-sector-panel__control-name';
            name.textContent = entry.name;
            item.appendChild(name);

            const value = doc.createElement('span');
            value.className = 'galaxy-sector-panel__control-value';
            const percent = total > 0 ? Math.round((entry.value / total) * 100) : 0;
            value.textContent = `${percent}%`;
            item.appendChild(value);

            fragment.appendChild(item);
        });

        details.list.replaceChildren(fragment);
        details.subtitle.classList.remove('is-hidden');
        details.list.classList.remove('is-hidden');
        details.empty.classList.add('is-hidden');
    }

    panel.classList.add('is-populated');

    updateOperationsPanel();
}

function updateOperationsPanel() {
    if (!galaxyUICache) {
        return;
    }
    const {
        operationsPanel,
        operationsEmpty,
        operationsForm,
        operationsInput,
        operationsButtons,
        operationsLaunchButton,
        operationsProgress,
        operationsProgressFill,
        operationsProgressLabel,
        operationsCostValue,
        operationsAvailable,
        operationsSummaryItems,
        operationsStatusMessage
    } = galaxyUICache;

    if (!operationsPanel || !operationsEmpty || !operationsForm || !operationsInput || !operationsButtons || !operationsLaunchButton || !operationsProgress || !operationsProgressFill || !operationsProgressLabel || !operationsCostValue || !operationsAvailable || !operationsSummaryItems || !operationsStatusMessage) {
        return;
    }

    const manager = galaxyManager;
    const formatter = getNumberFormatter();
    const selection = galaxyUICache.selectedSector;
    const enabled = !!(manager && manager.enabled);
    const antimatterResource = resources && resources.special ? resources.special.antimatter : null;
    const antimatterValue = antimatterResource ? Number(antimatterResource.value) : 0;
    const selectedKey = enabled && selection ? selection.key : null;
    const stepSize = getStoredStep(selectedKey);

    operationsStatusMessage.textContent = '';

    operationsInput.step = stepSize;
    updateOperationsStepDisplay(stepSize, formatter);

    const disableAllControls = () => {
        operationsInput.disabled = true;
        Object.values(operationsButtons).forEach((button) => {
            button.disabled = true;
        });
        operationsLaunchButton.disabled = true;
        operationsLaunchButton.classList.remove('is-hidden');
        operationsProgress.classList.add('is-hidden');
        operationsProgressFill.style.width = '0%';
        operationsProgressLabel.textContent = '';
    };

    if (!enabled) {
        operationsEmpty.classList.remove('is-hidden');
        operationsEmpty.textContent = 'Galaxy operations are offline.';
        operationsForm.classList.add('is-hidden');
        operationsCostValue.textContent = '0';
        operationsStatusMessage.textContent = '';
        disableAllControls();
        return;
    }

    if (!selection) {
        operationsEmpty.classList.remove('is-hidden');
        operationsEmpty.textContent = 'Select a contested sector to assign fleet power.';
        operationsForm.classList.add('is-hidden');
        operationsCostValue.textContent = '0';
        operationsStatusMessage.textContent = '';
        disableAllControls();
        return;
    }

    const sector = manager.getSector(selection.q, selection.r);
    if (!sector) {
        operationsEmpty.classList.remove('is-hidden');
        operationsEmpty.textContent = 'Sector data unavailable.';
        operationsForm.classList.add('is-hidden');
        operationsCostValue.textContent = '0';
        operationsStatusMessage.textContent = '';
        disableAllControls();
        return;
    }

    const totalControl = sector.getTotalControlValue();
    const uhfControl = sector.getControlValue ? sector.getControlValue(UHF_FACTION_KEY) : 0;
    const contested = totalControl > 0 && uhfControl < (totalControl - 1e-6);
    if (!contested) {
        operationsEmpty.classList.remove('is-hidden');
        operationsEmpty.textContent = 'UHF already controls this sector.';
        operationsForm.classList.add('is-hidden');
        operationsCostValue.textContent = '0';
        operationsStatusMessage.textContent = '';
        disableAllControls();
        return;
    }

    operationsEmpty.classList.add('is-hidden');
    operationsForm.classList.remove('is-hidden');

    const faction = manager.getFaction(UHF_FACTION_KEY);
    const availablePower = faction ? Math.max(0, faction.fleetPower) : 0;
    operationsAvailable.textContent = `Available: ${formatter(availablePower, false, 2)}`;

    const sectorPower = sector.getValue ? sector.getValue() : 0;
    const defensePower = manager.getSectorDefensePower(selection.key, UHF_FACTION_KEY);
    const hasStronghold = hasNeighboringUhfStronghold(manager, selection.q, selection.r);
    const hasUhfPresence = uhfControl > 0;
    const operation = manager.getOperationForSector(selection.key);
    const operationRunning = operation && operation.status === 'running';
    const assignment = operationRunning
        ? Math.max(0, Number(operation.reservedPower) || 0)
        : clampAssignment(getStoredAllocation(selection.key), availablePower);

    if (!operationRunning && !hasStronghold && !hasUhfPresence) {
        const assignmentDisplay = assignment > 0 ? Math.round(assignment * 100) / 100 : 0;
        operationsInput.value = assignmentDisplay;
        operationsInput.disabled = true;
        Object.values(operationsButtons).forEach((button) => {
            button.disabled = true;
        });
        operationsLaunchButton.disabled = true;
        operationsLaunchButton.classList.remove('is-hidden');
        operationsProgress.classList.add('is-hidden');
        operationsProgressFill.style.width = '0%';
        operationsProgressLabel.textContent = '';
        operationsCostValue.textContent = '0';
        operationsSummaryItems.success.textContent = '0%';
        operationsSummaryItems.gain.textContent = '+0%';
        operationsSummaryItems.loss.textContent = `-${formatter(0, false, 2)} power`;
        operationsStatusMessage.textContent = 'Establish a neighboring UHF stronghold before launching operations.';
        return;
    }

    if (!operationRunning) {
        setStoredAllocation(selection.key, assignment);
    }

    const assignmentDisplay = assignment > 0 ? Math.round(assignment * 100) / 100 : 0;
    operationsInput.value = assignmentDisplay;

    const baseCost = assignment * OPERATION_COST_PER_POWER;
    const cost = operationRunning && Number.isFinite(operation.launchCost) ? operation.launchCost : baseCost;
    operationsCostValue.textContent = formatter(cost, true);

    const successChance = computeSuccessChance(assignment, defensePower);
    const failureChance = Math.max(0, 1 - successChance);
    const successLoss = computeSuccessfulLoss(assignment, defensePower);
    const expectedLoss = (failureChance * assignment) + (successChance * successLoss);

    const otherTotal = Math.max(0, totalControl - uhfControl);
    const potentialGain = totalControl > 0 ? totalControl * 0.1 : sectorPower * 0.1;
    const actualGainControl = Math.min(otherTotal, potentialGain);
    const gainPercent = totalControl > 0 ? (actualGainControl / totalControl) * 100 : 10;

    operationsSummaryItems.success.textContent = formatPercentDisplay(successChance);
    operationsSummaryItems.gain.textContent = `+${Math.max(0, Math.round(gainPercent * 10) / 10)}%`;
    operationsSummaryItems.loss.textContent = `-${formatter(expectedLoss, false, 2)} power`;

    if (operationRunning) {
        operationsInput.disabled = true;
        Object.values(operationsButtons).forEach((button) => {
            button.disabled = true;
        });
        operationsLaunchButton.disabled = true;
        operationsLaunchButton.classList.add('is-hidden');
        operationsProgress.classList.remove('is-hidden');
        const duration = Number.isFinite(operation.durationMs) && operation.durationMs > 0
            ? operation.durationMs
            : OPERATION_DURATION_FALLBACK_MS;
        const elapsed = Math.max(0, Math.min(duration, Number(operation.elapsedMs) || 0));
        const progress = duration > 0 ? elapsed / duration : 1;
        const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
        operationsProgressFill.style.width = `${percent}%`;
        operationsProgressLabel.textContent = `Launch in progress — ${percent}%`;
        operationsStatusMessage.textContent = 'Deployment underway. Fleet power returns upon completion.';
        return;
    }

    operationsLaunchButton.classList.remove('is-hidden');
    operationsProgress.classList.add('is-hidden');
    operationsProgressFill.style.width = '0%';
    operationsProgressLabel.textContent = '';

    const hasFleetPower = availablePower > 0;
    const hasAssignment = assignment > 0;
    const hasAntimatter = !!antimatterResource && antimatterValue >= cost;
    const hasChance = successChance > 0;

    operationsInput.disabled = !hasFleetPower;
    Object.values(operationsButtons).forEach((button) => {
        button.disabled = !hasFleetPower;
    });

    let statusMessage = '';
    if (!hasFleetPower) {
        statusMessage = 'No fleet power available for deployment.';
    } else if (!hasAssignment) {
        statusMessage = 'Assign fleet power to begin an operation.';
    } else if (!hasAntimatter) {
        const deficit = cost - antimatterValue;
        statusMessage = `Insufficient antimatter by ${formatter(deficit, true)}.`;
    } else if (!hasChance) {
        statusMessage = `Assign more than ${formatter(sectorPower, false, 0)} power for a chance of success.`;
    }
    operationsStatusMessage.textContent = statusMessage;

    operationsLaunchButton.disabled = !hasFleetPower || !hasAssignment || !hasAntimatter || !hasChance;
}

function buildGalaxyHexMap(doc) {
    const baseSize = HEX_BASE_SIZE;
    const dimensions = getHexDimensions(baseSize);
    const grid = createHexGridData(HEX_RADIUS, baseSize);
    const offsets = {
        x: -grid.minX + (dimensions.width / 2),
        y: -grid.minY + (dimensions.height / 2)
    };
    const fragment = doc.createDocumentFragment();
    let initialFocus = null;
    grid.hexes.forEach((hexData) => {
        const displayName = formatSectorName(hexData.q, hexData.r);
        const hex = createGalaxyHex(doc, { ...hexData, displayName }, baseSize, offsets);
        if (!initialFocus && displayName === INITIAL_FOCUS_SECTOR) {
            initialFocus = {
                x: hexData.x + offsets.x,
                y: hexData.y + offsets.y
            };
        }
        fragment.appendChild(hex);
    });
    return {
        fragment,
        contentWidth: grid.width,
        contentHeight: grid.height,
        initialFocus
    };
}

function resetGalaxyHexStyles(cache) {
    if (!cache || !cache.hexElements) {
        return;
    }
    cache.hexElements.forEach((hex) => {
        clearHexControlStyles(hex);
    });
}

function clearHexControlStyles(hex) {
    hex.style.removeProperty('--galaxy-hex-background');
    hex.style.removeProperty('--galaxy-hex-background-hover');
    hex.style.removeProperty('--galaxy-hex-border');
    hex.classList.remove('is-controlled');
    hex.dataset.controller = '';
    hex.dataset.controllerName = '';
    hex.dataset.secondaryController = '';
    hex.dataset.secondaryControllerName = '';
    if (hex.galaxyDefenseElement) {
        hex.galaxyDefenseElement.textContent = '';
    }
}

function formatDefenseInteger(value) {
    const numeric = Number(value);
    const rounded = Number.isFinite(numeric) ? Math.round(numeric) : 0;
    if (GALAXY_DEFENSE_INT_FORMATTER) {
        return GALAXY_DEFENSE_INT_FORMATTER.format(rounded);
    }
    return String(rounded);
}

function updateHexDefenseDisplay(hex, sector, manager, uhfFaction) {
    const defenseNode = hex?.galaxyDefenseElement;
    if (!defenseNode) {
        return;
    }
    const doc = defenseNode.ownerDocument || globalThis.document;
    if (!doc) {
        return;
    }

    defenseNode.replaceChildren();

    if (!sector || !manager) {
        return;
    }

    const entries = [];
    const sectorPowerValue = Number(sector?.getValue?.()) || 0;
    const sectorPower = sectorPowerValue > 0 ? sectorPowerValue : 0;
    const uhfControl = Number(sector?.getControlValue?.(UHF_FACTION_KEY)) || 0;
    const totalControl = Number(sector?.getTotalControlValue?.()) || 0;
    const isUhfControlled = uhfControl > 0;
    const contestedWithUhf = isUhfControlled && (totalControl - uhfControl) > GALAXY_CONTROL_EPSILON;

    if (isUhfControlled && uhfFaction && typeof uhfFaction.getSectorDefense === 'function') {
        const defenseValue = Number(uhfFaction.getSectorDefense(sector, manager)) || 0;
        const total = Math.max(0, defenseValue + sectorPower);
        if (total > 0) {
            entries.push({ icon: GALAXY_DEFENSE_ICON, total, modifier: 'uhf' });
        }
    }

    const bordersUhf = typeof manager.hasUhfNeighboringStronghold === 'function'
        && manager.hasUhfNeighboringStronghold(sector.q, sector.r);
    if (contestedWithUhf || bordersUhf) {
        const breakdown = sector.getControlBreakdown?.() || [];
        for (let index = 0; index < breakdown.length; index += 1) {
            const entry = breakdown[index];
            if (!entry || entry.factionId === UHF_FACTION_KEY) {
                continue;
            }
            const faction = manager.getFaction?.(entry.factionId);
            if (!faction) {
                continue;
            }
            const assignmentValue = Number(faction.getBorderFleetAssignment?.(sector.key)) || 0;
            const total = Math.max(0, assignmentValue + sectorPower);
            if (total > 0) {
                entries.push({ icon: GALAXY_ALIEN_ICON, total, modifier: 'alien' });
            }
            break;
        }
    }

    if (!entries.length) {
        return;
    }

    entries.forEach(({ icon, total, modifier }) => {
        const entryNode = doc.createElement('span');
        entryNode.className = 'galaxy-hex__defense-entry';
        if (modifier) {
            entryNode.classList.add(`galaxy-hex__defense-entry--${modifier}`);
        }
        const iconNode = doc.createElement('span');
        iconNode.className = 'galaxy-hex__defense-icon';
        iconNode.textContent = icon;
        const valueNode = doc.createElement('span');
        valueNode.className = 'galaxy-hex__defense-text';
        valueNode.textContent = formatDefenseInteger(total);
        entryNode.append(iconNode, valueNode);
        defenseNode.appendChild(entryNode);
    });
}

function updateGalaxyHexControlColors(manager, cache) {
    if (!manager || !cache || !cache.hexElements) {
        return;
    }
    const uhfFaction = manager.getFaction?.(GALAXY_UHF_FACTION_ID) || null;
    cache.hexElements.forEach((hex) => {
        const q = Number(hex.dataset.q);
        const r = Number(hex.dataset.r);
        if (!Number.isFinite(q) || !Number.isFinite(r)) {
            return;
        }
        const sector = manager.getSector(q, r);
        if (!sector) {
            clearHexControlStyles(hex);
            updateHexDefenseDisplay(hex, null, manager, uhfFaction);
            return;
        }
        const leaders = sector.getControlLeaders ? sector.getControlLeaders(2) : [];
        if (!leaders.length) {
            clearHexControlStyles(hex);
            updateHexDefenseDisplay(hex, null, manager, uhfFaction);
            return;
        }
        const primaryEntry = leaders[0];
        const primaryFaction = manager.getFaction(primaryEntry.factionId);
        if (!primaryFaction) {
            clearHexControlStyles(hex);
            updateHexDefenseDisplay(hex, null, manager, uhfFaction);
            return;
        }
        const secondaryEntry = leaders.length > 1 ? leaders[1] : null;
        const hasSecondary = secondaryEntry && secondaryEntry.value > 0;
        const secondaryFaction = hasSecondary ? manager.getFaction(secondaryEntry.factionId) : null;

        if (hasSecondary && secondaryFaction) {
            const stripeStyles = createFactionStripeStyles(primaryFaction.color, secondaryFaction.color, primaryEntry.value, secondaryEntry.value);
            if (stripeStyles) {
                hex.style.setProperty('--galaxy-hex-background', stripeStyles.background);
                hex.style.setProperty('--galaxy-hex-background-hover', stripeStyles.hoverBackground);
                hex.style.setProperty('--galaxy-hex-border', stripeStyles.borderColor || primaryFaction.getBorderColor());
            } else {
                hex.style.setProperty('--galaxy-hex-background', primaryFaction.getMapBackground());
                hex.style.setProperty('--galaxy-hex-background-hover', primaryFaction.getHoverBackground());
                hex.style.setProperty('--galaxy-hex-border', primaryFaction.getBorderColor());
            }
        } else {
            hex.style.setProperty('--galaxy-hex-background', primaryFaction.getMapBackground());
            hex.style.setProperty('--galaxy-hex-background-hover', primaryFaction.getHoverBackground());
            hex.style.setProperty('--galaxy-hex-border', primaryFaction.getBorderColor());
        }

        hex.classList.add('is-controlled');
        hex.dataset.controller = primaryFaction.id;
        hex.dataset.controllerName = primaryFaction.name;
        if (secondaryFaction && hasSecondary) {
            hex.dataset.secondaryController = secondaryFaction.id;
            hex.dataset.secondaryControllerName = secondaryFaction.name;
        } else {
            hex.dataset.secondaryController = '';
            hex.dataset.secondaryControllerName = '';
        }
        updateHexDefenseDisplay(hex, sector, manager, uhfFaction);
    });
}

function updateGalaxyMapTransform(cache) {
    if (!cache || !cache.mapContent) {
        return;
    }
    const { mapContent, mapState } = cache;
    const offsetX = Number.isFinite(mapState.offsetX) ? mapState.offsetX : 0;
    const offsetY = Number.isFinite(mapState.offsetY) ? mapState.offsetY : 0;
    const scale = Number.isFinite(mapState.scale) && mapState.scale > 0 ? mapState.scale : 1;
    mapContent.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

function centerGalaxyMap(cache) {
    if (!cache || !cache.mapCanvas) {
        return false;
    }
    const { mapCanvas, mapWrapper, mapState } = cache;
    const canvasRect = mapCanvas.getBoundingClientRect();
    let viewWidth = canvasRect.width;
    let viewHeight = canvasRect.height;
    if (!(viewWidth > 0 || viewHeight > 0) && mapWrapper) {
        const wrapperRect = mapWrapper.getBoundingClientRect();
        if (wrapperRect.width > 0) {
            viewWidth = wrapperRect.width;
        }
        if (wrapperRect.height > 0) {
            viewHeight = wrapperRect.height;
        }
    }
    if (!(viewWidth > 0 && viewHeight > 0)) {
        if (mapState.lastViewWidth > 0 && mapState.lastViewHeight > 0) {
            viewWidth = mapState.lastViewWidth;
            viewHeight = mapState.lastViewHeight;
        } else {
            return false;
        }
    }

    mapState.lastViewWidth = viewWidth;
    mapState.lastViewHeight = viewHeight;
    mapState.scale = 1;

    const focus = mapState.initialFocus || {
        x: mapState.contentWidth * 0.5,
        y: mapState.contentHeight * 0.5
    };
    mapState.offsetX = (viewWidth * 0.5) - focus.x;
    mapState.offsetY = (viewHeight * 0.5) - focus.y;
    mapState.deferredCenter = false;
    updateGalaxyMapTransform(cache);
    return true;
}

function scheduleGalaxyMapCenter(cache) {
    if (!cache || !cache.mapState) {
        return;
    }
    const { mapState } = cache;
    if (mapState.pendingCenterRequest) {
        return;
    }
    if (!cache.mapWrapper || !cache.mapWrapper.offsetParent) {
        mapState.deferredCenter = true;
        return;
    }
    const scheduler = (globalThis && globalThis.requestAnimationFrame) || ((callback) => globalThis.setTimeout(callback, 16));
    mapState.pendingCenterRequest = scheduler(() => {
        mapState.pendingCenterRequest = null;
        if (!cache.mapWrapper || !cache.mapWrapper.offsetParent) {
            mapState.deferredCenter = true;
            return;
        }
        if (!centerGalaxyMap(cache)) {
            scheduleGalaxyMapCenter(cache);
        }
    });
}

function clampScale(scale) {
    return scale < HEX_MIN_SCALE ? HEX_MIN_SCALE : (scale > HEX_MAX_SCALE ? HEX_MAX_SCALE : scale);
}

function adjustGalaxyMapScale(multiplier, { focalX, focalY } = {}) {
    if (!galaxyUICache || !galaxyUICache.mapState) {
        return;
    }
    const cache = galaxyUICache;
    const { mapState, mapCanvas } = cache;
    const wrapperRect = mapCanvas.getBoundingClientRect();
    const currentScale = mapState.scale || 1;
    const targetScale = clampScale(currentScale * multiplier);
    const scaleFactor = targetScale / currentScale;
    if (scaleFactor === 1) {
        return;
    }

    const focalScreenX = Number.isFinite(focalX) ? focalX : wrapperRect.width * 0.5;
    const focalScreenY = Number.isFinite(focalY) ? focalY : wrapperRect.height * 0.5;

    mapState.offsetX = mapState.offsetX + (1 - scaleFactor) * (focalScreenX - mapState.offsetX);
    mapState.offsetY = mapState.offsetY + (1 - scaleFactor) * (focalScreenY - mapState.offsetY);
    mapState.scale = targetScale;
    updateGalaxyMapTransform(cache);
}

function startGalaxyMapPan(event) {
    if (!galaxyUICache || !galaxyUICache.mapState) {
        return;
    }
    const cache = galaxyUICache;
    const canvas = cache.mapCanvas;
    if (!canvas || canvas.classList.contains('is-disabled')) {
        return;
    }

    if (supportsPointerEvents && event.type === 'pointerdown' && event.pointerType === 'mouse' && event.button !== 0) {
        return;
    }
    if (!supportsPointerEvents && event.type === 'mousedown' && event.button !== 0) {
        return;
    }
    const target = event.target;
    if (target && target.closest('.galaxy-map-zoom')) {
        return;
    }

    const coords = extractClientCoordinates(event);
    if (!coords) {
        return;
    }

    const pointerId = getPointerId(event);
    cache.mapState.isPointerDown = true;
    cache.mapState.isPanning = false;
    cache.mapState.pointerId = pointerId;
    cache.mapState.panStartX = coords.x;
    cache.mapState.panStartY = coords.y;
    cache.mapState.startOffsetX = cache.mapState.offsetX;
    cache.mapState.startOffsetY = cache.mapState.offsetY;
    cache.mapState.preventNextClick = false;

    if (!supportsPointerEvents) {
        attachDocumentPanListeners();
    }
}

function moveGalaxyMapPan(event) {
    if (!galaxyUICache || !galaxyUICache.mapState || !galaxyUICache.mapState.isPointerDown) {
        return;
    }
    const pointerId = getPointerId(event);
    if (pointerId !== galaxyUICache.mapState.pointerId) {
        return;
    }
    const cache = galaxyUICache;
    const coords = extractClientCoordinates(event);
    if (!coords) {
        return;
    }

    const rawDeltaX = coords.x - cache.mapState.panStartX;
    const rawDeltaY = coords.y - cache.mapState.panStartY;

    if (!cache.mapState.isPanning) {
        const distanceSquared = (rawDeltaX * rawDeltaX) + (rawDeltaY * rawDeltaY);
        if (distanceSquared < PAN_ACTIVATION_DISTANCE_SQUARED) {
            return;
        }
        cache.mapState.isPanning = true;
        cache.mapState.preventNextClick = true;
        if (supportsPointerEvents && typeof event.pointerId === 'number') {
            cache.mapCanvas.setPointerCapture(event.pointerId);
        } else {
            attachDocumentPanListeners();
        }
        cache.mapCanvas.classList.add('is-panning');
    }

    const scale = cache.mapState.scale || 1;
    const deltaX = rawDeltaX / scale;
    const deltaY = rawDeltaY / scale;
    cache.mapState.offsetX = cache.mapState.startOffsetX + deltaX;
    cache.mapState.offsetY = cache.mapState.startOffsetY + deltaY;
    updateGalaxyMapTransform(cache);

    if (event.cancelable) {
        event.preventDefault();
    }
}

function endGalaxyMapPan(event) {
    if (!galaxyUICache || !galaxyUICache.mapState || !galaxyUICache.mapState.isPointerDown) {
        return;
    }
    const pointerId = getPointerId(event);
    if (pointerId !== galaxyUICache.mapState.pointerId) {
        return;
    }

    const wasPanning = galaxyUICache.mapState.isPanning;
    galaxyUICache.mapState.isPointerDown = false;
    galaxyUICache.mapState.isPanning = false;
    galaxyUICache.mapState.pointerId = null;
    galaxyUICache.mapState.preventNextClick = wasPanning;

    const canvas = galaxyUICache.mapCanvas;
    if (supportsPointerEvents && canvas && typeof event.pointerId === 'number' && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
    }
    detachDocumentPanListeners();
    if (canvas) {
        canvas.classList.remove('is-panning');
    }

    if (event.cancelable && wasPanning) {
        event.preventDefault();
    }
}

function extractClientCoordinates(event) {
    if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
        return { x: event.clientX, y: event.clientY };
    }
    if (event.touches && event.touches[0]) {
        return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    if (event.changedTouches && event.changedTouches[0]) {
        return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
    }
    return null;
}

function getPointerId(event) {
    if (typeof event.pointerId === 'number') {
        return event.pointerId;
    }
    if (typeof event.identifier === 'number') {
        return event.identifier;
    }
    return 'mouse';
}

function attachDocumentPanListeners() {
    if (supportsPointerEvents || typeof document === 'undefined' || legacyPanAttached) {
        return;
    }
    document.addEventListener('mousemove', moveGalaxyMapPan, { passive: false });
    document.addEventListener('mouseup', endGalaxyMapPan, { passive: false });
    document.addEventListener('touchmove', moveGalaxyMapPan, { passive: false });
    document.addEventListener('touchend', endGalaxyMapPan, { passive: false });
    document.addEventListener('touchcancel', endGalaxyMapPan, { passive: false });
    legacyPanAttached = true;
}

function detachDocumentPanListeners() {
    if (supportsPointerEvents || typeof document === 'undefined' || !legacyPanAttached) {
        return;
    }
    document.removeEventListener('mousemove', moveGalaxyMapPan, { passive: false });
    document.removeEventListener('mouseup', endGalaxyMapPan, { passive: false });
    document.removeEventListener('touchmove', moveGalaxyMapPan, { passive: false });
    document.removeEventListener('touchend', endGalaxyMapPan, { passive: false });
    document.removeEventListener('touchcancel', endGalaxyMapPan, { passive: false });
    legacyPanAttached = false;
}

function createGalaxySection(doc, title, description) {
    const section = doc.createElement('section');
    section.className = 'galaxy-section';

    const header = doc.createElement('header');
    header.className = 'galaxy-section__header';
    header.textContent = title;
    section.appendChild(header);

    const body = doc.createElement('div');
    body.className = 'galaxy-section__body';
    section.appendChild(body);

    if (description) {
        const descriptionNode = doc.createElement('p');
        descriptionNode.className = 'galaxy-section__description';
        descriptionNode.textContent = description;
        body.appendChild(descriptionNode);
    }

    return { section, header, body };
}

function cacheGalaxyElements() {
    if (galaxyUICache) {
        return galaxyUICache;
    }

    const doc = globalThis.document;
    if (!doc) {
        return null;
    }

    const container = doc.getElementById('space-galaxy');
    if (!container) {
        return null;
    }

    const layout = doc.createElement('div');
    layout.className = 'galaxy-layout';

    const firstRow = doc.createElement('div');
    firstRow.className = 'galaxy-row galaxy-row--primary';

    const sectorDetails = createGalaxySection(doc, 'Sector Details', '');
    sectorDetails.section.classList.add('galaxy-section--sector');
    const sectorContent = doc.createElement('div');
    sectorContent.className = 'galaxy-sector-panel';
    sectorContent.dataset.emptyMessage = 'No sector selected.';
    sectorContent.textContent = sectorContent.dataset.emptyMessage;
    sectorDetails.body.appendChild(sectorContent);

    const overviewSection = createGalaxySection(doc, 'Galactic Overview');
    overviewSection.section.classList.add('galaxy-section--overview');

    const mapWrapper = doc.createElement('div');
    mapWrapper.className = 'galaxy-map-wrapper';
    const mapCanvas = doc.createElement('div');
    mapCanvas.className = 'galaxy-map';

    const mapContent = doc.createElement('div');
    mapContent.className = 'galaxy-map-content';
    const hexBuild = buildGalaxyHexMap(doc);
    const initialFocus = hexBuild.initialFocus || {
        x: hexBuild.contentWidth * 0.5,
        y: hexBuild.contentHeight * 0.5
    };
    mapContent.style.width = `${hexBuild.contentWidth}px`;
    mapContent.style.height = `${hexBuild.contentHeight}px`;
    mapContent.appendChild(hexBuild.fragment);
    const hexElements = Array.from(mapContent.querySelectorAll('.galaxy-hex'));

    hexElements.forEach((hex) => {
        hex.addEventListener('click', handleGalaxyHexClick);
    });

    const mapOverlay = doc.createElement('div');
    mapOverlay.className = 'galaxy-map-overlay';
    mapOverlay.textContent = '';

    const zoomControls = doc.createElement('div');
    zoomControls.className = 'galaxy-map-zoom';

    const zoomIn = doc.createElement('button');
    zoomIn.type = 'button';
    zoomIn.className = 'galaxy-map-zoom__button';
    zoomIn.textContent = '+';
    zoomIn.setAttribute('aria-label', 'Zoom in');

    const zoomOut = doc.createElement('button');
    zoomOut.type = 'button';
    zoomOut.className = 'galaxy-map-zoom__button';
    zoomOut.textContent = '-';
    zoomOut.setAttribute('aria-label', 'Zoom out');

    zoomControls.appendChild(zoomIn);
    zoomControls.appendChild(zoomOut);

    mapCanvas.appendChild(mapContent);
    mapCanvas.appendChild(zoomControls);
    mapWrapper.appendChild(mapCanvas);
    mapWrapper.appendChild(mapOverlay);
    overviewSection.body.appendChild(mapWrapper);

    const mapState = {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        contentWidth: hexBuild.contentWidth,
        contentHeight: hexBuild.contentHeight,
        isPanning: false,
        pointerId: null,
        panStartX: 0,
        panStartY: 0,
        startOffsetX: 0,
        startOffsetY: 0,
        overlayHideTimeout: null,
        initialized: false,
        initialFocus,
        pendingCenterRequest: null,
        deferredCenter: false,
        lastViewWidth: 0,
        lastViewHeight: 0,
        isPointerDown: false,
        preventNextClick: false
    };

    if (supportsPointerEvents) {
        mapCanvas.addEventListener('pointerdown', startGalaxyMapPan, { passive: false });
        mapCanvas.addEventListener('pointermove', moveGalaxyMapPan, { passive: false });
        mapCanvas.addEventListener('pointerup', endGalaxyMapPan, { passive: false });
        mapCanvas.addEventListener('pointerleave', endGalaxyMapPan, { passive: false });
        mapCanvas.addEventListener('pointercancel', endGalaxyMapPan, { passive: false });
    } else {
        mapCanvas.addEventListener('mousedown', startGalaxyMapPan, { passive: false });
        mapCanvas.addEventListener('touchstart', startGalaxyMapPan, { passive: false });
    }

    zoomIn.addEventListener('click', (event) => {
        event.stopPropagation();
        adjustGalaxyMapScale(HEX_SCALE_STEP);
    });
    zoomOut.addEventListener('click', (event) => {
        event.stopPropagation();
        adjustGalaxyMapScale(1 / HEX_SCALE_STEP);
    });
    zoomIn.addEventListener('mousedown', (event) => event.stopPropagation());
    zoomOut.addEventListener('mousedown', (event) => event.stopPropagation());
    zoomIn.addEventListener('touchstart', (event) => {
        event.stopPropagation();
        if (event.cancelable) {
            event.preventDefault();
        }
    }, { passive: false });
    zoomOut.addEventListener('touchstart', (event) => {
        event.stopPropagation();
        if (event.cancelable) {
            event.preventDefault();
        }
    }, { passive: false });

    firstRow.appendChild(sectorDetails.section);
    firstRow.appendChild(overviewSection.section);

    const secondRow = doc.createElement('div');
    secondRow.className = 'galaxy-row galaxy-row--secondary';

    const operations = createGalaxySection(doc, 'Operations', '');
    operations.section.classList.add('galaxy-section--operations');

    const operationsPanel = doc.createElement('div');
    operationsPanel.className = 'galaxy-operations-panel';

    const operationsEmpty = doc.createElement('div');
    operationsEmpty.className = 'galaxy-operations-panel__empty';
    operationsEmpty.textContent = 'Select a contested sector to assign fleet power.';
    operationsPanel.appendChild(operationsEmpty);

    const operationsForm = doc.createElement('div');
    operationsForm.className = 'galaxy-operations-form is-hidden';
    operationsPanel.appendChild(operationsForm);

    const formHeader = doc.createElement('div');
    formHeader.className = 'galaxy-operations-form__header';
    operationsForm.appendChild(formHeader);

    const powerLabel = doc.createElement('span');
    powerLabel.className = 'galaxy-operations-form__label';
    powerLabel.textContent = 'Fleet Power';
    formHeader.appendChild(powerLabel);

    const powerAvailable = doc.createElement('span');
    powerAvailable.className = 'galaxy-operations-form__available';
    powerAvailable.textContent = 'Available: 0';
    formHeader.appendChild(powerAvailable);

    const powerRow = doc.createElement('div');
    powerRow.className = 'galaxy-operations-form__row';
    operationsForm.appendChild(powerRow);

    const powerInput = doc.createElement('input');
    powerInput.type = 'number';
    powerInput.min = '0';
    powerInput.step = '1';
    powerInput.className = 'galaxy-operations-form__input';
    powerRow.appendChild(powerInput);

    const buttonGroup = doc.createElement('div');
    buttonGroup.className = 'galaxy-operations-form__buttons';
    powerRow.appendChild(buttonGroup);

    const operationsButtons = {};
    [
        { key: 'zero', label: '0' },
        { key: 'decrement', label: '-1' },
        { key: 'increment', label: '+1' },
        { key: 'max', label: 'Max' },
        { key: 'divide', label: '/10' },
        { key: 'multiply', label: 'x10' }
    ].forEach(({ key, label }) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'galaxy-operations-form__button';
        button.textContent = label;
        buttonGroup.appendChild(button);
        operationsButtons[key] = button;
    });

    const launchContainer = doc.createElement('div');
    launchContainer.className = 'galaxy-operations-launch';
    operationsForm.appendChild(launchContainer);

    const launchControls = doc.createElement('div');
    launchControls.className = 'galaxy-operations-launch__controls';
    launchContainer.appendChild(launchControls);

    const launchButton = doc.createElement('button');
    launchButton.type = 'button';
    launchButton.className = 'galaxy-operations-launch__button';
    launchButton.textContent = 'Launch';
    launchControls.appendChild(launchButton);

    const costRow = doc.createElement('div');
    costRow.className = 'galaxy-operations-form__cost';
    const costLabel = doc.createElement('span');
    costLabel.className = 'galaxy-operations-form__cost-label';
    costLabel.textContent = 'Antimatter Cost';
    const costTooltip = doc.createElement('span');
    costTooltip.className = 'info-tooltip-icon';
    costTooltip.innerHTML = '&#9432;';
    costTooltip.title = 'Each point of fleet power consumes 1,000 antimatter when launching.';
    const costValue = doc.createElement('span');
    costValue.className = 'galaxy-operations-form__cost-value';
    costValue.textContent = '0';
    costRow.appendChild(costLabel);
    costRow.appendChild(costTooltip);
    costRow.appendChild(costValue);
    launchControls.appendChild(costRow);

    const progressContainer = doc.createElement('div');
    progressContainer.className = 'galaxy-operations-progress is-hidden';
    const progressTrack = doc.createElement('div');
    progressTrack.className = 'galaxy-operations-progress__track';
    const progressFill = doc.createElement('div');
    progressFill.className = 'galaxy-operations-progress__fill';
    progressTrack.appendChild(progressFill);
    const progressLabel = doc.createElement('span');
    progressLabel.className = 'galaxy-operations-progress__label';
    progressContainer.appendChild(progressTrack);
    progressContainer.appendChild(progressLabel);
    launchContainer.appendChild(progressContainer);

    const summary = doc.createElement('div');
    summary.className = 'galaxy-operations-summary';
    operationsForm.appendChild(summary);

    const summaryItems = {};
    [
        { key: 'success', label: 'Success' },
        { key: 'gain', label: 'Gain' },
        { key: 'loss', label: 'Loss' }
    ].forEach(({ key, label }) => {
        const item = doc.createElement('div');
        item.className = 'galaxy-operations-summary__item';
        const itemLabel = doc.createElement('span');
        itemLabel.className = 'galaxy-operations-summary__label';
        itemLabel.textContent = label;
        const itemValue = doc.createElement('span');
        itemValue.className = 'galaxy-operations-summary__value';
        itemValue.textContent = key === 'gain' ? '+0%' : '0%';
        item.appendChild(itemLabel);
        item.appendChild(itemValue);
        summary.appendChild(item);
        summaryItems[key] = itemValue;
    });

    const statusMessage = doc.createElement('div');
    statusMessage.className = 'galaxy-operations-form__status';
    operationsForm.appendChild(statusMessage);

    powerInput.addEventListener('input', handleOperationsInputChange);
    powerInput.addEventListener('change', handleOperationsInputChange);
    Object.entries(operationsButtons).forEach(([key, button]) => {
        button.dataset.action = key;
        button.addEventListener('click', handleOperationsButtonClick);
    });
    launchButton.addEventListener('click', handleOperationsLaunch);

    operations.body.appendChild(operationsPanel);

    const incomingAttacks = createGalaxySection(doc, 'Incoming Attacks', 'Monitor hostile fleets en route to your sectors.');
    incomingAttacks.section.classList.add('galaxy-section--attacks');
    const attackContent = doc.createElement('div');
    attackContent.className = 'galaxy-attack-panel';
    attackContent.dataset.emptyMessage = 'No hostiles detected.';
    attackContent.textContent = attackContent.dataset.emptyMessage;
    incomingAttacks.body.appendChild(attackContent);

    secondRow.appendChild(operations.section);
    secondRow.appendChild(incomingAttacks.section);

    const thirdRow = doc.createElement('div');
    thirdRow.className = 'galaxy-row galaxy-row--tertiary';

    const logistics = createGalaxySection(doc, 'Logistics & Statistics');
    logistics.section.classList.add('galaxy-section--logistics');
    const logisticsStats = doc.createElement('div');
    logisticsStats.className = 'galaxy-logistics-stats';
    const logisticsPowerRow = doc.createElement('div');
    logisticsPowerRow.className = 'galaxy-logistics-stat';
    const logisticsPowerLabel = doc.createElement('span');
    logisticsPowerLabel.className = 'galaxy-logistics-stat__label';
    logisticsPowerLabel.textContent = 'Fleet Power';
    const logisticsPowerValue = doc.createElement('span');
    logisticsPowerValue.className = 'galaxy-logistics-stat__value';
    logisticsPowerValue.textContent = '0';
    logisticsPowerRow.appendChild(logisticsPowerLabel);
    logisticsPowerRow.appendChild(logisticsPowerValue);
    const logisticsCapacityRow = doc.createElement('div');
    logisticsCapacityRow.className = 'galaxy-logistics-stat';
    const logisticsCapacityLabel = doc.createElement('span');
    logisticsCapacityLabel.className = 'galaxy-logistics-stat__label';
    logisticsCapacityLabel.textContent = 'Fleet Capacity';
    const logisticsCapacityValue = doc.createElement('span');
    logisticsCapacityValue.className = 'galaxy-logistics-stat__value';
    logisticsCapacityValue.textContent = '0';
    logisticsCapacityRow.appendChild(logisticsCapacityLabel);
    logisticsCapacityRow.appendChild(logisticsCapacityValue);
    logisticsStats.appendChild(logisticsPowerRow);
    logisticsStats.appendChild(logisticsCapacityRow);

    const threatRow = doc.createElement('div');
    threatRow.className = 'galaxy-logistics-stat';
    const threatLabel = doc.createElement('span');
    threatLabel.className = 'galaxy-logistics-stat__label galaxy-logistics-stat__label--with-icon';
    const threatLabelText = doc.createElement('span');
    threatLabelText.textContent = 'Threat Level';
    const threatTooltip = doc.createElement('span');
    threatTooltip.className = 'info-tooltip-icon';
    threatTooltip.innerHTML = '&#9432;';
    threatTooltip.title = 'placeholder threat level description.';
    threatLabel.appendChild(threatLabelText);
    threatLabel.appendChild(threatTooltip);
    const threatValue = doc.createElement('span');
    threatValue.className = 'galaxy-logistics-stat__value';
    threatValue.textContent = '0%';
    threatRow.appendChild(threatLabel);
    threatRow.appendChild(threatValue);
    logisticsStats.appendChild(threatRow);

    const operationsRow = doc.createElement('div');
    operationsRow.className = 'galaxy-logistics-stat';
    const operationsLabel = doc.createElement('span');
    operationsLabel.className = 'galaxy-logistics-stat__label';
    operationsLabel.textContent = 'Successful Operations';
    const operationsValue = doc.createElement('span');
    operationsValue.className = 'galaxy-logistics-stat__value';
    operationsValue.textContent = '0';
    operationsRow.appendChild(operationsLabel);
    operationsRow.appendChild(operationsValue);
    logisticsStats.appendChild(operationsRow);

    logistics.body.appendChild(logisticsStats);

    const upgrades = createGalaxySection(doc, 'Upgrades', '');
    upgrades.section.classList.add('galaxy-section--upgrades');

    const upgradesShop = doc.createElement('div');
    upgradesShop.className = 'galaxy-upgrades-shop';

    const shopHeader = doc.createElement('div');
    shopHeader.className = 'galaxy-upgrades-shop__header';
    const shopTitle = doc.createElement('span');
    shopTitle.className = 'galaxy-upgrades-shop__title';
    shopTitle.textContent = 'Fleet Logistics Shop';
    const shopTotal = doc.createElement('span');
    shopTotal.className = 'galaxy-upgrades-shop__total';
    shopTotal.textContent = 'Total Multiplier';
    const shopTotalValue = doc.createElement('span');
    shopTotalValue.className = 'galaxy-upgrades-shop__total-value';
    shopTotalValue.textContent = `${formatFleetMultiplier(1)}x`;
    shopTotal.appendChild(shopTotalValue);
    shopHeader.appendChild(shopTitle);
    shopHeader.appendChild(shopTotal);

    const shopGrid = doc.createElement('div');
    shopGrid.className = 'galaxy-upgrades-shop__grid';
    const managerForShop = galaxyManager;
    const shopSummaries = managerForShop?.getFleetUpgradeSummaries?.();
    const upgradeEntries = Array.isArray(shopSummaries) && shopSummaries.length > 0
        ? shopSummaries
        : FLEET_UPGRADE_FALLBACKS;
    const fleetShopItems = {};
    const incrementText = `+${GALAXY_UI_FLEET_UPGRADE_INCREMENT.toFixed(2)}x Capacity`;
    upgradeEntries.forEach((entry) => {
        const item = doc.createElement('div');
        item.className = 'galaxy-upgrades-shop__item';

        const labelRow = doc.createElement('div');
        labelRow.className = 'galaxy-upgrades-shop__label-row';
        const label = doc.createElement('span');
        label.className = 'galaxy-upgrades-shop__label';
        label.textContent = entry.label;
        labelRow.appendChild(label);

        const statsRow = doc.createElement('div');
        statsRow.className = 'galaxy-upgrades-shop__stats';
        const multiplierValue = doc.createElement('span');
        multiplierValue.className = 'galaxy-upgrades-shop__multiplier';
        multiplierValue.textContent = `${formatFleetMultiplier(1)}x`;
        const purchasesValue = doc.createElement('span');
        purchasesValue.className = 'galaxy-upgrades-shop__purchases';
        purchasesValue.textContent = '0 purchases';
        statsRow.appendChild(multiplierValue);
        statsRow.appendChild(purchasesValue);

        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'galaxy-upgrades-shop__button';
        button.dataset.upgrade = entry.key;
        button.textContent = incrementText;
        button.addEventListener('click', handleFleetUpgradePurchase);

        const costRow = doc.createElement('div');
        costRow.className = 'galaxy-upgrades-shop__cost';
        const costLabel = doc.createElement('span');
        costLabel.className = 'galaxy-upgrades-shop__cost-label';
        costLabel.textContent = 'Cost';
        const costValue = doc.createElement('span');
        costValue.className = 'galaxy-upgrades-shop__cost-value';
        costValue.textContent = '0';
        const costUnit = doc.createElement('span');
        costUnit.className = 'galaxy-upgrades-shop__cost-unit';
        costUnit.textContent = entry.costLabel || '';
        costRow.appendChild(costLabel);
        costRow.appendChild(costValue);
        costRow.appendChild(costUnit);

        item.appendChild(labelRow);
        item.appendChild(statsRow);
        item.appendChild(button);
        item.appendChild(costRow);
        shopGrid.appendChild(item);

        fleetShopItems[entry.key] = {
            multiplier: multiplierValue,
            purchases: purchasesValue,
            button,
            costValue
        };
    });

    upgradesShop.appendChild(shopHeader);
    upgradesShop.appendChild(shopGrid);
    upgrades.body.appendChild(upgradesShop);

    thirdRow.appendChild(upgrades.section);
    thirdRow.appendChild(logistics.section);

    layout.appendChild(firstRow);
    layout.appendChild(secondRow);
    layout.appendChild(thirdRow);

    container.replaceChildren(layout);

    galaxyUICache = {
        container,
        layout,
        mapWrapper,
        mapCanvas,
        mapContent,
        mapOverlay,
        mapState,
        zoomIn,
        zoomOut,
        operationsPanel,
        operationsEmpty,
        operationsForm,
        operationsInput: powerInput,
        operationsButtons,
        operationsLaunchButton: launchButton,
        operationsProgress: progressContainer,
        operationsProgressFill: progressFill,
        operationsProgressLabel: progressLabel,
        operationsCostValue: costValue,
        operationsAvailable: powerAvailable,
        operationsSummaryItems: summaryItems,
        operationsStatusMessage: statusMessage,
        logisticsStats,
        logisticsPowerValue,
        logisticsCapacityValue,
        logisticsThreatValue: threatValue,
        logisticsOperationsValue: operationsValue,
        fleetShop: {
            container: upgradesShop,
            totalValue: shopTotalValue,
            items: fleetShopItems
        },
        attackContent,
        sectorContent,
        sectorDetails: null,
        hexElements,
        selectedHex: null,
        selectedSector: null
    };

    refreshEmptyStates();
    if (!centerGalaxyMap(galaxyUICache)) {
        scheduleGalaxyMapCenter(galaxyUICache);
    }

    return galaxyUICache;
}

function refreshEmptyStates() {
    if (!galaxyUICache) {
        return;
    }

    const listData = [
        [galaxyUICache.logisticsList, galaxyUICache.logisticsPlaceholder],
        [galaxyUICache.operationsList, galaxyUICache.operationsPlaceholder]
    ];
    listData.forEach(([list, placeholder]) => {
        if (!list || !placeholder) {
            return;
        }
        const totalChildren = list.children.length;
        const placeholderPresent = list.contains(placeholder);
        const effectiveLength = placeholderPresent ? totalChildren - 1 : totalChildren;
        const hasEntries = effectiveLength > 0;
        placeholder.textContent = hasEntries
            ? ''
            : list.dataset.emptyMessage || 'Nothing to display.';
        placeholder.classList.toggle('is-hidden', hasEntries);
    });

    const panels = [galaxyUICache.attackContent, galaxyUICache.sectorContent];
    panels.forEach((panel) => {
        if (!panel) {
            return;
        }
        if (!panel.textContent) {
            panel.textContent = panel.dataset.emptyMessage || 'Stand by.';
        }
    });
}

function updateFleetShopDisplay(manager, cache) {
    const shop = cache?.fleetShop;
    if (!shop) {
        return;
    }
    const totalMultiplier = manager?.getFleetCapacityMultiplier?.() ?? 1;
    if (shop.totalValue) {
        shop.totalValue.textContent = `${formatFleetMultiplier(totalMultiplier)}x`;
    }
    const summaries = manager?.getFleetUpgradeSummaries?.();
    const entries = Array.isArray(summaries) ? summaries : [];
    const lookup = new Map();
    entries.forEach((entry) => {
        lookup.set(entry.key, entry);
    });
    Object.entries(shop.items || {}).forEach(([key, nodes]) => {
        const entry = lookup.get(key) || null;
        const multiplierValue = entry?.multiplier ?? 1;
        const purchaseCount = Number(entry?.purchases) || 0;
        if (nodes.multiplier) {
            nodes.multiplier.textContent = `${formatFleetMultiplier(multiplierValue)}x`;
        }
        if (nodes.purchases) {
            const suffix = purchaseCount === 1 ? 'purchase' : 'purchases';
            nodes.purchases.textContent = `${purchaseCount} ${suffix}`;
        }
        if (nodes.costValue) {
            nodes.costValue.textContent = formatFleetUpgradeCost(entry?.cost);
        }
        if (nodes.button) {
            nodes.button.disabled = !(entry?.affordable);
        }
    });
}

function updateLogisticsDisplay(manager, cache) {
    if (!cache) {
        return;
    }
    const powerNode = cache.logisticsPowerValue;
    const capacityNode = cache.logisticsCapacityValue;
    const threatNode = cache.logisticsThreatValue;
    const operationsNode = cache.logisticsOperationsValue;
    if (!powerNode || !capacityNode) {
        return;
    }
    const faction = manager?.getFaction?.(GALAXY_UHF_FACTION_ID) || null;
    const power = Number.isFinite(faction?.fleetPower) ? faction.fleetPower : 0;
    const capacity = Number.isFinite(faction?.fleetCapacity) ? faction.fleetCapacity : 0;
    powerNode.textContent = formatFleetValue(power);
    capacityNode.textContent = formatFleetValue(capacity);
    if (threatNode) {
        const ratio = manager?.getUhfControlRatio?.() ?? 0;
        threatNode.textContent = formatPercentDisplay(ratio);
    }
    if (operationsNode) {
        const successes = manager?.getSuccessfulOperations?.() ?? 0;
        operationsNode.textContent = formatFleetValue(successes);
    }
}

function initializeGalaxyUI() {
    const cache = galaxyUICache || cacheGalaxyElements();
    if (!cache) {
        return;
    }
    updateGalaxyUI();
}

function updateGalaxyUI() {
    const cache = galaxyUICache || cacheGalaxyElements();
    if (!cache) {
        return;
    }

    const manager = galaxyManager;
    const enabled = !!(manager && manager.enabled);

    if (!enabled) {
        clearSelectedGalaxySector();
        cache.mapCanvas.dataset.ready = '';
        cache.mapOverlay.textContent = '';
        cache.mapOverlay.classList.remove('is-visible');
        cache.mapCanvas.classList.add('is-disabled');
        if (supportsPointerEvents && cache.mapState.pointerId !== null && cache.mapCanvas.hasPointerCapture(cache.mapState.pointerId)) {
            cache.mapCanvas.releasePointerCapture(cache.mapState.pointerId);
        }
        cache.mapState.isPanning = false;
        cache.mapState.pointerId = null;
        cache.mapCanvas.classList.remove('is-panning');
        detachDocumentPanListeners();
        if (cache.mapState.overlayHideTimeout) {
            globalThis.clearTimeout(cache.mapState.overlayHideTimeout);
            cache.mapState.overlayHideTimeout = null;
        }
        resetGalaxyHexStyles(cache);
        updateLogisticsDisplay(null, cache);
        updateFleetShopDisplay(null, cache);
        refreshEmptyStates();
        return;
    }

    cache.mapCanvas.classList.remove('is-disabled');

    if (cache.mapCanvas.dataset.ready !== 'true') {
        cache.mapCanvas.dataset.ready = 'true';
        cache.mapOverlay.textContent = 'Initializing galactic coordinates...';
        cache.mapOverlay.classList.add('is-visible');
        if (!centerGalaxyMap(cache)) {
            scheduleGalaxyMapCenter(cache);
        }
        if (cache.mapState.overlayHideTimeout) {
            globalThis.clearTimeout(cache.mapState.overlayHideTimeout);
        }
        cache.mapState.overlayHideTimeout = globalThis.setTimeout(() => {
            cache.mapOverlay.classList.remove('is-visible');
            cache.mapOverlay.textContent = '';
            cache.mapState.overlayHideTimeout = null;
        }, 650);
    } else {
        cache.mapOverlay.classList.remove('is-visible');
        cache.mapOverlay.textContent = '';
    }

    updateLogisticsDisplay(manager, cache);
    updateFleetShopDisplay(manager, cache);
    updateGalaxyHexControlColors(manager, cache);
    renderSelectedSectorDetails();
    refreshEmptyStates();
    if (cache.mapState.deferredCenter && cache.mapWrapper && cache.mapWrapper.offsetParent) {
        scheduleGalaxyMapCenter(cache);
    }
}

if (typeof window !== 'undefined') {
    window.initializeGalaxyUI = initializeGalaxyUI;
    window.updateGalaxyUI = updateGalaxyUI;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeGalaxyUI, updateGalaxyUI };
}
