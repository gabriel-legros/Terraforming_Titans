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
const HEX_NEIGHBOR_OFFSETS = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
];
const PAN_ACTIVATION_DISTANCE = 6;
const PAN_ACTIVATION_DISTANCE_SQUARED = PAN_ACTIVATION_DISTANCE * PAN_ACTIVATION_DISTANCE;
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

const OPERATION_DURATION_FALLBACK_MS = 5 * 60 * 1000;

let galaxyOperationUI = null;
if (typeof module !== 'undefined' && module.exports) {
    ({ GalaxyOperationUI: galaxyOperationUI } = require('./operationUI'));
}
if (!galaxyOperationUI && typeof window !== 'undefined' && window.GalaxyOperationUI) {
    galaxyOperationUI = window.GalaxyOperationUI;
}
if (!galaxyOperationUI && typeof globalThis !== 'undefined' && globalThis.GalaxyOperationUI) {
    galaxyOperationUI = globalThis.GalaxyOperationUI;
}

const OPERATION_ARROW_LINE_WIDTH = 4;
const OPERATION_ARROW_MARGIN = 24;
const OPERATION_ARROW_MIN_LENGTH = 18;

const operationsAllocations = new Map();
const operationsStepSizes = new Map();
const operationsAutoStates = new Map();

function getDevicePixelRatioSafe() {
    const ratio = globalThis?.devicePixelRatio;
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

function snapToDevicePixels(value) {
    const ratio = getDevicePixelRatioSafe();
    return Math.round(value * ratio) / ratio;
}

function getDefaultOperationDurationMs() {
    const provided = globalThis?.GALAXY_OPERATION_DURATION_MS;
    if (Number.isFinite(provided) && provided > 0) {
        return provided;
    }
    return OPERATION_DURATION_FALLBACK_MS;
}

function formatOperationDurationDisplay(milliseconds) {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
        return '0s';
    }
    const seconds = Math.floor(milliseconds / 1000);
    const formatted = globalThis?.formatDuration?.(seconds);
    if (formatted) {
        return formatted;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
}

let galaxyUICache = null;
const supportsPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;
let legacyPanAttached = false;

function isGalaxySubtabActive() {
    const doc = globalThis?.document;
    if (!doc) {
        return true;
    }
    const button = doc.querySelector?.('[data-subtab="space-galaxy"]');
    if (button?.classList?.contains('active')) {
        return true;
    }
    const content = doc.getElementById?.('space-galaxy');
    return !!content?.classList?.contains('active');
}

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
        return formatter(value, true, 2);
    }
    return value.toLocaleString('en-US');
}

function formatAttackCountdown(milliseconds) {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
        return '00:00';
    }
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        const paddedMinutes = String(minutes).padStart(2, '0');
        const paddedSeconds = String(seconds).padStart(2, '0');
        return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    }
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
}

function formatAutoThresholdDisplay(value) {
    if (!Number.isFinite(value) || value <= 0) {
        return DEFAULT_OPERATION_AUTO_THRESHOLD.toFixed(2);
    }
    const rounded = Math.round(value * 100) / 100;
    return rounded.toFixed(2);
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

function isUhfOperation(operation) {
    if (!operation) {
        return false;
    }
    const factionId = typeof operation.factionId === 'string' && operation.factionId
        ? operation.factionId
        : UHF_FACTION_KEY;
    return factionId === UHF_FACTION_KEY;
}

function calculateEnemySectorDefense(manager, sector, breakdown) {
    if (!manager || !sector) {
        return { base: 0, fleet: 0, total: 0 };
    }
    if (typeof manager.getSectorDefenseSummary === 'function') {
        const summary = manager.getSectorDefenseSummary(sector, UHF_FACTION_KEY);
        return {
            base: summary?.basePower > 0 ? summary.basePower : 0,
            fleet: summary?.fleetPower > 0 ? summary.fleetPower : 0,
            total: summary?.totalPower > 0 ? summary.totalPower : 0
        };
    }
    const entries = Array.isArray(breakdown) ? breakdown : sector.getControlBreakdown?.() || [];
    if (!entries.length) {
        return { base: 0, fleet: 0, total: 0 };
    }
    let baseTotal = 0;
    let fleetTotal = 0;
    for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        if (!entry || entry.factionId === UHF_FACTION_KEY) {
            continue;
        }
        const faction = manager.getFaction?.(entry.factionId) || null;
        if (!faction) {
            continue;
        }
        const defense = Number(faction.getSectorDefense?.(sector, manager));
        if (Number.isFinite(defense) && defense > 0) {
            baseTotal += defense;
        }
        const assignment = Number(faction.getBorderFleetAssignment?.(sector.key));
        if (Number.isFinite(assignment) && assignment > 0) {
            fleetTotal += assignment;
        }
    }
    return {
        base: baseTotal,
        fleet: fleetTotal,
        total: baseTotal + fleetTotal
    };
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
    const centerX = x + offsets.x;
    const centerY = y + offsets.y;
    const key = `${q},${r}`;
    hex.dataset.key = key;
    hex.galaxyKey = key;
    hex.galaxyCenterX = centerX;
    hex.galaxyCenterY = centerY;

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

    updateSectorDefenseSection();
    galaxyOperationUI?.updateOperationsPanel?.();
}


function getSelectedSectorKey() {
    if (!galaxyUICache || !galaxyUICache.selectedSector) {
        return null;
    }
    return galaxyUICache.selectedSector.key || null;
}









function normalizeDefenseStepSize(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return 1;
    }
    const floored = Math.max(1, Math.floor(numeric));
    let normalized = 1;
    while (normalized * 10 <= floored) {
        normalized *= 10;
    }
    return normalized;
}

function updateDefenseStepDisplay(step) {
    if (!galaxyUICache || !galaxyUICache.defenseButtons) {
        return;
    }
    const buttons = galaxyUICache.defenseButtons;
    const normalized = normalizeDefenseStepSize(step);
    const formatted = formatDefenseInteger(normalized);
    if (buttons.decrement) {
        buttons.decrement.textContent = `-${formatted}`;
    }
    if (buttons.increment) {
        buttons.increment.textContent = `+${formatted}`;
    }
    if (buttons.zero) {
        buttons.zero.textContent = '0';
    }
    if (buttons.max) {
        buttons.max.textContent = 'Max';
    }
    if (buttons.divide) {
        buttons.divide.textContent = '/10';
    }
    if (buttons.multiply) {
        buttons.multiply.textContent = 'x10';
    }
}

function getDefenseStepForSector(sectorKey) {
    if (!sectorKey) {
        return 1;
    }
    const manager = galaxyManager;
    const faction = manager?.getFaction?.(UHF_FACTION_KEY);
    if (!faction || typeof faction.getDefenseStep !== 'function') {
        return 1;
    }
    return normalizeDefenseStepSize(faction.getDefenseStep(sectorKey));
}

function setDefenseStepForSector(sectorKey, value) {
    if (!sectorKey) {
        return;
    }
    const manager = galaxyManager;
    if (!manager?.setDefenseStep) {
        return;
    }
    manager.setDefenseStep({ factionId: UHF_FACTION_KEY, sectorKey, value });
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


function formatPercentDisplay(value) {
    const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
    return `${percent}%`;
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

        const managementSection = doc.createElement('div');
        managementSection.className = 'galaxy-sector-panel__management';

        const managementSubtitle = doc.createElement('div');
        managementSubtitle.className = 'galaxy-sector-panel__subtitle';
        managementSubtitle.textContent = 'Sector Management';
        managementSection.appendChild(managementSubtitle);

        const createStatRow = (label) => {
            const stat = doc.createElement('div');
            stat.className = 'galaxy-sector-panel__stat';
            const statLabel = doc.createElement('span');
            statLabel.className = 'galaxy-sector-panel__stat-label';
            statLabel.textContent = label;
            const statValue = doc.createElement('span');
            statValue.className = 'galaxy-sector-panel__stat-value';
            stat.append(statLabel, statValue);
            return { stat, statLabel, statValue };
        };

        const rewardRow = createStatRow('Reward');
        rewardRow.statValue.textContent = '—';
        container.appendChild(rewardRow.stat);

        const worldRow = createStatRow('Worlds');
        const fleetDefenseRow = createStatRow('Fleet Defense');
        const totalDefenseRow = createStatRow('Total Defense');

        managementSection.append(worldRow.stat, fleetDefenseRow.stat, totalDefenseRow.stat);

        const lockOption = doc.createElement('label');
        lockOption.className = 'galaxy-sector-panel__lock-option';

        const lockInput = doc.createElement('input');
        lockInput.type = 'checkbox';
        lockInput.className = 'galaxy-sector-panel__lock-checkbox';
        lockInput.addEventListener('change', handleSectorLockToggle);

        const lockText = doc.createElement('span');
        lockText.className = 'galaxy-sector-panel__lock-label';
        lockText.textContent = 'Restrict RWG here';

        lockOption.appendChild(lockInput);
        lockOption.appendChild(lockText);

        managementSection.appendChild(lockOption);

        container.appendChild(managementSection);

        const enemySection = doc.createElement('div');
        enemySection.className = 'galaxy-sector-panel__enemy';

        const enemySubtitle = doc.createElement('div');
        enemySubtitle.className = 'galaxy-sector-panel__subtitle';
        enemySubtitle.textContent = 'Enemy Strength';
        enemySection.appendChild(enemySubtitle);

        const enemySectorRow = createStatRow('Sector Defense');
        const enemyFleetRow = createStatRow('Fleet Defense');
        const enemyTotalRow = createStatRow('Total Defense');

        enemySection.append(enemySectorRow.stat, enemyFleetRow.stat, enemyTotalRow.stat);

        panel.replaceChildren(container);

        details = {
            container,
            title,
            managementSection,
            management: {
                worldsValue: worldRow.statValue,
                fleetDefenseValue: fleetDefenseRow.statValue,
                totalDefenseValue: totalDefenseRow.statValue
            },
            enemySection,
            enemy: {
                sectorValue: enemySectorRow.statValue,
                fleetValue: enemyFleetRow.statValue,
                totalValue: enemyTotalRow.statValue
            },
            lockOption,
            lockInput,
            subtitle,
            list,
            empty,
            reward: {
                row: rewardRow.stat,
                label: rewardRow.statLabel,
                value: rewardRow.statValue
            }
        };
        galaxyUICache.sectorDetails = details;
    } else if (!panel.contains(details.container)) {
        panel.replaceChildren(details.container);
    }

    details.title.textContent = selection.displayName === 'Core'
        ? 'Core Sector'
        : `Sector ${selection.displayName}`;

    const spaceManagerInstance = globalThis.spaceManager;
    const worldCount = spaceManagerInstance?.getWorldCountPerSector
        ? spaceManagerInstance.getWorldCountPerSector(selectionLabel)
        : 0;

    const uhfFaction = manager.getFaction?.(UHF_FACTION_KEY) || null;
    const totalControl = Number(sector?.getTotalControlValue?.()) || 0;
    const uhfControl = Number(sector?.getControlValue?.(UHF_FACTION_KEY)) || 0;

    const bordersUhf = typeof manager.hasUhfNeighboringStronghold === 'function'
        && manager.hasUhfNeighboringStronghold(sector.q, sector.r);

    if (details.reward?.label && !details.reward.label.querySelector('.info-tooltip-icon')) {
        const rewardTooltip = doc.createElement('span');
        rewardTooltip.className = 'info-tooltip-icon';
        rewardTooltip.innerHTML = '&#9432;';
        rewardTooltip.title = 'Fully controlled sectors grant already habitable worlds.  Each count as a normal terraformed world, but unlike regular terraformed worlds, will be lost if the sector is lost.';
        details.reward.label.appendChild(rewardTooltip);
    }

    const rewardEntries = typeof manager.getSectorsReward === 'function'
        ? manager.getSectorsReward([sector])
        : typeof sector.getSectorReward === 'function'
            ? sector.getSectorReward()
            : [];
    const rewardWorlds = Array.isArray(rewardEntries)
        ? rewardEntries.reduce((total, entry) => total + (entry?.type === 'habitableWorld' ? Number(entry?.amount) || 0 : 0), 0)
        : 0;
    const rewardWorldsForDefense = isUhfFullControlSector(sector) ? rewardWorlds : 0;

    let baseDefense = 0;
    let fleetDefense = 0;
    let totalDefense = 0;
    let resolvedDefenseFromSummary = false;

    if (typeof manager.getSectorDefenseSummary === 'function') {
        const summary = manager.getSectorDefenseSummary(sector);
        if (summary && Array.isArray(summary.contributions)) {
            const uhfContribution = summary.contributions.find((entry) => entry?.factionId === UHF_FACTION_KEY);
            if (uhfContribution) {
                baseDefense = uhfContribution.basePower > 0 ? uhfContribution.basePower : 0;
                fleetDefense = uhfContribution.fleetPower > 0 ? uhfContribution.fleetPower : 0;
                totalDefense = uhfContribution.totalPower > 0 ? uhfContribution.totalPower : 0;
                resolvedDefenseFromSummary = true;
            }
        }
    }

    if (!resolvedDefenseFromSummary) {
        const multiplier = manager.getFleetCapacityMultiplier?.() ?? 1;
        const combinedWorlds = Math.max(0, worldCount + rewardWorldsForDefense);
        const baseWorldDefense = combinedWorlds > 0 ? combinedWorlds * 100 * multiplier : 0;
        const uhfDefense = isFinite(Number(uhfFaction?.getSectorDefense?.(sector, manager)))
            ? Number(uhfFaction.getSectorDefense(sector, manager))
            : 0;
        fleetDefense = Math.max(0, uhfDefense - baseWorldDefense);
        baseDefense = Math.max(0, uhfDefense - fleetDefense);
        totalDefense = baseDefense + fleetDefense;
    }

    const hasEnemyControl = (totalControl - uhfControl) > GALAXY_CONTROL_EPSILON || uhfControl === 0;
    const enemyDefense = hasEnemyControl
        ? calculateEnemySectorDefense(manager, sector, breakdown)
        : { base: 0, fleet: 0, total: 0 };

    let enemyTotalDefense = enemyDefense.total;
    if (!(enemyTotalDefense > 0) && (bordersUhf || hasEnemyControl)) {
        enemyTotalDefense = Math.max(0, enemyDefense.base + enemyDefense.fleet);
    }

    const shouldShowEnemySection = hasEnemyControl && details.enemySection;
    if (shouldShowEnemySection) {
        if (!details.enemySection.isConnected && details.container) {
            const referenceNode = details.managementSection?.nextSibling || null;
            if (referenceNode) {
                details.container.insertBefore(details.enemySection, referenceNode);
            } else {
                details.container.appendChild(details.enemySection);
            }
        }
        details.enemy.sectorValue.textContent = formatDefenseInteger(enemyDefense.base);
        details.enemy.fleetValue.textContent = formatDefenseInteger(enemyDefense.fleet);
        details.enemy.totalValue.textContent = enemyTotalDefense > 0 ? formatDefenseInteger(enemyTotalDefense) : '0';
    } else if (details.enemySection?.isConnected) {
        details.enemySection.remove();
    }

    if (details.reward) {
        if (rewardWorlds > 0) {
            const roundedWorlds = Math.max(0, Math.round(rewardWorlds));
            const worldLabel = roundedWorlds === 1 ? 'World' : 'Worlds';
            details.reward.value.textContent = `${roundedWorlds} ${worldLabel}`;
            details.reward.row.classList.remove('is-hidden');
        } else {
            details.reward.value.textContent = '—';
            details.reward.row.classList.add('is-hidden');
        }
    }

    const managementVisible = uhfControl > GALAXY_CONTROL_EPSILON;
    if (details.managementSection) {
        details.managementSection.classList.toggle('is-hidden', !managementVisible);
    }
    if (managementVisible) {
        const baseWorlds = Math.max(0, Math.round(worldCount));
        const rewardDisplay = Math.max(0, Math.round(rewardWorldsForDefense));
        details.management.worldsValue.textContent = rewardDisplay > 0
            ? `${baseWorlds}+${rewardDisplay}`
            : String(baseWorlds);
        details.management.fleetDefenseValue.textContent = formatDefenseInteger(fleetDefense);
        details.management.totalDefenseValue.textContent = formatDefenseInteger(totalDefense);
    } else {
        details.management.worldsValue.textContent = '0';
        details.management.fleetDefenseValue.textContent = '0';
        details.management.totalDefenseValue.textContent = '0';
    }

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

    updateSectorDefenseSection();
    galaxyOperationUI?.updateOperationsPanel?.();
}


function updateSectorDefenseSection() {
    const cache = galaxyUICache;
    if (!cache || !cache.defenseSection) {
        return;
    }
    const section = cache.defenseSection;
    const manager = galaxyManager;
    const enabled = !!(manager && manager.enabled);
    if (!enabled) {
        section.classList.add('is-hidden');
        return;
    }
    section.classList.remove('is-hidden');
    const selection = cache.selectedSector;
    if (!selection) {
        section.classList.add('is-hidden');
        return;
    }
    const sector = manager?.getSector?.(selection.q, selection.r);
    if (!sector) {
        if (cache.defenseWarning) {
            cache.defenseWarning.textContent = 'Sector data unavailable.';
            cache.defenseWarning.classList.remove('is-hidden');
        }
        if (cache.defenseForm) {
            cache.defenseForm.classList.add('is-hidden');
        }
        return;
    }

    const faction = manager.getFaction ? manager.getFaction(UHF_FACTION_KEY) : null;
    const uhfControl = Number(sector.getControlValue ? sector.getControlValue(UHF_FACTION_KEY) : 0);
    if (!(uhfControl > 0)) {
        if (cache.defenseWarning) {
            cache.defenseWarning.textContent = 'UHF must control this sector to station defensive fleets.';
            cache.defenseWarning.classList.remove('is-hidden');
        }
        if (cache.defenseForm) {
            cache.defenseForm.classList.add('is-hidden');
        }
        return;
    }

    const capacity = manager.getDefenseCapacity ? manager.getDefenseCapacity(UHF_FACTION_KEY) : 0;
    if (!(capacity > 0)) {
        if (cache.defenseWarning) {
            cache.defenseWarning.textContent = 'Expand fleet logistics to unlock defensive deployments.';
            cache.defenseWarning.classList.remove('is-hidden');
        }
        if (cache.defenseForm) {
            cache.defenseForm.classList.add('is-hidden');
        }
        return;
    }

    if (cache.defenseWarning) {
        cache.defenseWarning.classList.add('is-hidden');
    }
    if (cache.defenseForm) {
        cache.defenseForm.classList.remove('is-hidden');
    }

    const sectorName = selection.displayName === 'Core'
        ? 'Core'
        : selection.displayName || sector.getDisplayName?.() || sector.key;

    if (cache.defenseSectorLabel) {
        cache.defenseSectorLabel.textContent = sectorName === 'Core'
            ? 'Sector: Core'
            : `Sector: ${sectorName}`;
    }

    if (cache.defenseCapacityValue) {
        cache.defenseCapacityValue.textContent = `Defense Pool: ${formatDefenseInteger(capacity)}`;
    }

    const operational = faction?.getOperationalFleetPower
        ? faction.getOperationalFleetPower(manager)
        : Math.max(0, faction?.fleetPower || 0);
    if (cache.defenseReservationValue) {
        cache.defenseReservationValue.textContent = `Ops Pool: ${formatDefenseInteger(operational)}`;
    }

    const manualAssigned = manager.getManualDefenseAssignment
        ? manager.getManualDefenseAssignment(sector.key, UHF_FACTION_KEY)
        : 0;
    const scale = faction?.getDefenseScale ? faction.getDefenseScale(manager) : 0;
    const effective = manualAssigned > 0 && scale > 0 ? manualAssigned * scale : 0;
    const totalAssigned = manager.getDefenseAssignmentTotal
        ? manager.getDefenseAssignmentTotal(UHF_FACTION_KEY)
        : 0;
    const remaining = Math.max(0, capacity - Math.max(0, totalAssigned));
    const step = getDefenseStepForSector(sector.key);
    updateDefenseStepDisplay(step);

    if (cache.defenseAssignedValue) {
        cache.defenseAssignedValue.textContent = `Assigned: ${formatDefenseInteger(manualAssigned)}`;
    }
    if (cache.defenseEffectiveValue) {
        cache.defenseEffectiveValue.textContent = `Effective: ${formatDefenseInteger(effective)}`;
    }
    if (cache.defenseRemainingValue) {
        cache.defenseRemainingValue.textContent = `Remaining: ${formatDefenseInteger(remaining)}`;
    }

    if (cache.defenseInput) {
        cache.defenseInput.value = `${Math.max(0, Math.round(manualAssigned))}`;
        cache.defenseInput.disabled = false;
    }
    if (cache.defenseButtons) {
        Object.values(cache.defenseButtons).forEach((button) => {
            if (!button) {
                return;
            }
            button.disabled = false;
        });
    }
}

function handleDefenseInputChange(event) {
    const cache = galaxyUICache;
    const manager = galaxyManager;
    if (!cache || !manager || !manager.enabled) {
        return;
    }
    const selection = cache.selectedSector;
    if (!selection) {
        event.target.value = '0';
        return;
    }
    const key = selection.key;
    const rawValue = event.target.value;
    if (event.type === 'input' && typeof rawValue === 'string' && rawValue.trim() === '') {
        return;
    }
    const numeric = Number(rawValue);
    const sanitized = Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
    const applied = manager.setDefenseAssignment({ factionId: UHF_FACTION_KEY, sectorKey: key, value: sanitized });
    event.target.value = `${Math.max(0, Math.round(applied))}`;
    renderSelectedSectorDetails();
}

function handleDefenseButtonClick(event) {
    event.preventDefault();
    const action = event.currentTarget?.dataset?.action;
    const cache = galaxyUICache;
    const manager = galaxyManager;
    if (!action || !cache || !manager || !manager.enabled) {
        return;
    }
    const selection = cache.selectedSector;
    if (!selection) {
        return;
    }
    const key = selection.key;
    const current = manager.getManualDefenseAssignment
        ? manager.getManualDefenseAssignment(key, UHF_FACTION_KEY)
        : 0;
    let target = current;
    let step = getDefenseStepForSector(key);
    const capacity = manager.getDefenseCapacity
        ? manager.getDefenseCapacity(UHF_FACTION_KEY)
        : Number.POSITIVE_INFINITY;

    switch (action) {
    case 'zero':
        target = 0;
        break;
    case 'increment':
        target = current + step;
        break;
    case 'decrement':
        target = current > 0 ? Math.max(0, current - step) : 0;
        break;
    case 'divide': {
        const reduced = step > 1 ? Math.floor(step / 10) : 1;
        const resolved = reduced > 0 ? reduced : 1;
        setDefenseStepForSector(key, resolved);
        step = getDefenseStepForSector(key);
        updateDefenseStepDisplay(step);
        renderSelectedSectorDetails();
        return;
    }
    case 'multiply': {
        const multiplied = step * 10;
        const bounded = Number.isFinite(multiplied) ? multiplied : step;
        const capacityLimit = Number.isFinite(capacity) && capacity > 0
            ? Math.floor(capacity)
            : 0;
        const limit = Math.floor(bounded);
        const resolved = capacityLimit > 0
            ? Math.min(capacityLimit, limit)
            : limit;
        const normalized = resolved > 0 ? resolved : 1;
        setDefenseStepForSector(key, normalized);
        step = getDefenseStepForSector(key);
        updateDefenseStepDisplay(step);
        renderSelectedSectorDetails();
        return;
    }
    case 'max':
        if (Number.isFinite(capacity) && capacity > 0) {
            target = Math.floor(capacity);
        }
        break;
    default:
        break;
    }

    const applied = manager.setDefenseAssignment({ factionId: UHF_FACTION_KEY, sectorKey: key, value: target });
    if (cache.defenseInput) {
        cache.defenseInput.value = `${Math.max(0, Math.round(applied))}`;
    }
    renderSelectedSectorDetails();
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
    const uhfControl = Number(sector?.getControlValue?.(UHF_FACTION_KEY)) || 0;
    const totalControl = Number(sector?.getTotalControlValue?.()) || 0;
    const isUhfControlled = uhfControl > 0;
    const contestedWithUhf = isUhfControlled && (totalControl - uhfControl) > GALAXY_CONTROL_EPSILON;

    const hasEnemyNeighbor = (() => {
        if (!manager || typeof manager.getSector !== 'function') {
            return false;
        }
        for (let index = 0; index < HEX_NEIGHBOR_OFFSETS.length; index += 1) {
            const offset = HEX_NEIGHBOR_OFFSETS[index];
            const neighbor = manager.getSector(sector.q + offset.q, sector.r + offset.r);
            if (!neighbor) {
                continue;
            }
            const neighborTotal = Number(neighbor.getTotalControlValue?.()) || 0;
            if (!(neighborTotal > 0)) {
                continue;
            }
            const neighborUhf = Number(neighbor.getControlValue?.(UHF_FACTION_KEY)) || 0;
            if ((neighborTotal - neighborUhf) > GALAXY_CONTROL_EPSILON) {
                return true;
            }
        }
        return false;
    })();

    const hasManualDefense = manager.getManualDefenseAssignment
        ? manager.getManualDefenseAssignment(sector.key, UHF_FACTION_KEY) > 0
        : false;

    const shouldShowUhf = isUhfControlled && (contestedWithUhf || hasEnemyNeighbor || hasManualDefense);

    let uhfTotalDefense = 0;
    if (typeof manager.getSectorDefenseSummary === 'function') {
        const combinedSummary = manager.getSectorDefenseSummary(sector);
        const uhfEntry = combinedSummary?.contributions?.find?.((entry) => entry.factionId === UHF_FACTION_KEY);
        if (uhfEntry && uhfEntry.totalPower > 0) {
            uhfTotalDefense = uhfEntry.totalPower;
        }
    }
    if (shouldShowUhf) {
        if (!(uhfTotalDefense > 0) && uhfFaction && typeof uhfFaction.getSectorDefense === 'function') {
            const defenseValue = Number(uhfFaction.getSectorDefense(sector, manager)) || 0;
            uhfTotalDefense = Math.max(0, defenseValue);
        }
        if (uhfTotalDefense > 0) {
            entries.push({ icon: GALAXY_DEFENSE_ICON, total: uhfTotalDefense, modifier: 'uhf' });
        }
    }

    const bordersUhf = typeof manager.hasUhfNeighboringStronghold === 'function'
        && manager.hasUhfNeighboringStronghold(sector.q, sector.r);
    let enemyTotalDefense = 0;
    if (typeof manager.getSectorDefenseSummary === 'function') {
        const enemySummary = manager.getSectorDefenseSummary(sector, UHF_FACTION_KEY);
        if (enemySummary && enemySummary.totalPower > 0) {
            enemyTotalDefense = enemySummary.totalPower;
        }
    }
    if (contestedWithUhf || bordersUhf) {
        if (!(enemyTotalDefense > 0)) {
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
                const defense = Number(faction.getSectorDefense?.(sector, manager)) || 0;
                const assignment = Number(faction.getBorderFleetAssignment?.(sector.key)) || 0;
                const total = Math.max(0, defense + assignment);
                if (total > 0) {
                    enemyTotalDefense = total;
                    break;
                }
            }
        }
        if (enemyTotalDefense > 0) {
            entries.push({ icon: GALAXY_ALIEN_ICON, total: enemyTotalDefense, modifier: 'alien' });
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

function clearOperationArrows(cache) {
    if (!cache || !cache.operationArrows) {
        return;
    }
    cache.operationArrows.forEach((arrow) => {
        if (arrow) {
            arrow.remove();
        }
    });
    cache.operationArrows.clear();
}


function updateGalaxyMapTransform(cache) {
    if (!cache || !cache.mapContent) {
        return;
    }
    const { mapContent, mapState } = cache;
    const rawOffsetX = Number.isFinite(mapState.offsetX) ? mapState.offsetX : 0;
    const rawOffsetY = Number.isFinite(mapState.offsetY) ? mapState.offsetY : 0;
    const scale = Number.isFinite(mapState.scale) && mapState.scale > 0 ? mapState.scale : 1;
    const offsetX = snapToDevicePixels(rawOffsetX);
    const offsetY = snapToDevicePixels(rawOffsetY);
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

    const nextOffsetX = mapState.offsetX + (1 - scaleFactor) * (focalScreenX - mapState.offsetX);
    const nextOffsetY = mapState.offsetY + (1 - scaleFactor) * (focalScreenY - mapState.offsetY);
    mapState.offsetX = nextOffsetX;
    mapState.offsetY = nextOffsetY;
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

function createInfoTooltip(doc, title) {
    const tooltip = doc.createElement('span');
    tooltip.className = 'info-tooltip-icon';
    tooltip.innerHTML = '&#9432;';
    tooltip.title = title;
    return tooltip;
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
    overviewSection.header.classList.add('galaxy-section__header--with-icon');
    overviewSection.header.appendChild(createInfoTooltip(
        doc,
        'The galactic map allows you to monitor the state of the civil war across the galaxy, and to eventually participate.  The UHF starts with a 10% control of sector R5-07.  Conquering certain sectors will be required to advance the story.'
    ));

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
    const operationsLayer = doc.createElement('div');
    operationsLayer.className = 'galaxy-map-operations-layer';
    mapContent.appendChild(operationsLayer);
    const hexElements = Array.from(mapContent.querySelectorAll('.galaxy-hex'));
    const hexLookup = new Map();

    hexElements.forEach((hex) => {
        hex.addEventListener('click', handleGalaxyHexClick);
        if (hex.galaxyKey) {
            hexLookup.set(hex.galaxyKey, hex);
        }
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
    const operationsCache = galaxyOperationUI.populateSection({
        doc,
        container: operations.body,
        createInfoTooltip
    });

    const incomingAttacks = createGalaxySection(doc, 'Incoming Attacks', '');
    incomingAttacks.section.classList.add('galaxy-section--attacks');
    const attackContent = doc.createElement('div');
    attackContent.className = 'galaxy-attack-panel';
    attackContent.dataset.emptyMessage = 'No hostiles detected.';
    const attackPlaceholder = doc.createElement('p');
    attackPlaceholder.className = 'galaxy-attack-panel__placeholder';
    attackPlaceholder.textContent = attackContent.dataset.emptyMessage;
    const attackList = doc.createElement('div');
    attackList.className = 'galaxy-attack-panel__list';
    attackContent.appendChild(attackPlaceholder);
    attackContent.appendChild(attackList);

    const defenseSection = doc.createElement('div');
    defenseSection.className = 'galaxy-defense-section is-hidden';
    const defenseTitle = doc.createElement('div');
    defenseTitle.className = 'galaxy-defense-section__title';
    defenseTitle.textContent = 'Sector Defense';
    defenseSection.appendChild(defenseTitle);

    const defenseWarning = doc.createElement('p');
    defenseWarning.className = 'galaxy-defense-section__warning is-hidden';
    defenseWarning.textContent = 'Select a UHF-controlled sector to allocate defenses.';
    defenseSection.appendChild(defenseWarning);

    const defenseForm = doc.createElement('div');
    defenseForm.className = 'galaxy-defense-form is-hidden';

    const defenseMeta = doc.createElement('div');
    defenseMeta.className = 'galaxy-defense-form__meta';
    const defenseSectorLabel = doc.createElement('span');
    defenseSectorLabel.className = 'galaxy-defense-form__sector';
    defenseSectorLabel.textContent = 'Sector: —';
    const defenseCapacityValue = doc.createElement('span');
    defenseCapacityValue.className = 'galaxy-defense-form__capacity';
    defenseCapacityValue.textContent = 'Defense Pool: 0';
    const defenseReservationValue = doc.createElement('span');
    defenseReservationValue.className = 'galaxy-defense-form__reservation';
    defenseReservationValue.textContent = 'Ops Pool: 0';
    defenseMeta.append(defenseSectorLabel, defenseCapacityValue, defenseReservationValue);

    const defenseSummary = doc.createElement('div');
    defenseSummary.className = 'galaxy-defense-form__summary';
    const defenseAssignedValue = doc.createElement('span');
    defenseAssignedValue.className = 'galaxy-defense-form__summary-item';
    defenseAssignedValue.textContent = 'Assigned: 0';
    const defenseEffectiveValue = doc.createElement('span');
    defenseEffectiveValue.className = 'galaxy-defense-form__summary-item';
    defenseEffectiveValue.textContent = 'Effective: 0';
    const defenseRemainingValue = doc.createElement('span');
    defenseRemainingValue.className = 'galaxy-defense-form__summary-item';
    defenseRemainingValue.textContent = 'Remaining: 0';
    defenseSummary.append(defenseAssignedValue, defenseEffectiveValue, defenseRemainingValue);

    const defenseRow = doc.createElement('div');
    defenseRow.className = 'galaxy-defense-form__row';
    const defenseInput = doc.createElement('input');
    defenseInput.type = 'number';
    defenseInput.min = '0';
    defenseInput.step = '1';
    defenseInput.className = 'galaxy-defense-form__input';
    defenseRow.appendChild(defenseInput);

    const defenseButtonsPrimary = doc.createElement('div');
    defenseButtonsPrimary.className = 'galaxy-defense-form__buttons';
    const defenseButtonsSecondary = doc.createElement('div');
    defenseButtonsSecondary.className = 'galaxy-defense-form__buttons galaxy-defense-form__buttons--secondary';
    const defenseButtonsColumn = doc.createElement('div');
    defenseButtonsColumn.className = 'galaxy-defense-form__button-column';

    const defenseButtons = {};
    [
        { key: 'zero', label: '0', group: 'primary' },
        { key: 'decrement', label: '-1', group: 'primary' },
        { key: 'increment', label: '+1', group: 'primary' },
        { key: 'max', label: 'Max', group: 'primary' },
        { key: 'divide', label: '/10', group: 'secondary' },
        { key: 'multiply', label: 'x10', group: 'secondary' }
    ].forEach(({ key, label, group }) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'galaxy-defense-form__button';
        button.dataset.action = key;
        button.textContent = label;
        if (group === 'secondary') {
            defenseButtonsSecondary.appendChild(button);
        } else {
            defenseButtonsPrimary.appendChild(button);
        }
        defenseButtons[key] = button;
    });

    defenseButtonsColumn.appendChild(defenseButtonsPrimary);
    defenseButtonsColumn.appendChild(defenseButtonsSecondary);
    defenseRow.appendChild(defenseButtonsColumn);

    defenseForm.append(defenseMeta, defenseSummary, defenseRow);
    defenseSection.appendChild(defenseForm);
    attackContent.appendChild(defenseSection);
    incomingAttacks.body.appendChild(attackContent);

    defenseInput.addEventListener('input', handleDefenseInputChange);
    defenseInput.addEventListener('change', handleDefenseInputChange);
    defenseInput.addEventListener('blur', handleDefenseInputChange);
    Object.values(defenseButtons).forEach((button) => {
        button.addEventListener('click', handleDefenseButtonClick);
    });

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
    logisticsPowerLabel.className = 'galaxy-logistics-stat__label galaxy-logistics-stat__label--with-icon';
    logisticsPowerLabel.textContent = 'Fleet Power';
    logisticsPowerLabel.appendChild(createInfoTooltip(
        doc,
        'Total UHF fleet strength currently ready to deploy in operations or defenses.  This value grows proportionally to fleet capacity over time, but suffers exponential growth penalty after it reaches 50% of fleet capacity.'
    ));
    const logisticsPowerValue = doc.createElement('span');
    logisticsPowerValue.className = 'galaxy-logistics-stat__value';
    logisticsPowerValue.textContent = '0';
    logisticsPowerRow.appendChild(logisticsPowerLabel);
    logisticsPowerRow.appendChild(logisticsPowerValue);
    const logisticsCapacityRow = doc.createElement('div');
    logisticsCapacityRow.className = 'galaxy-logistics-stat';
    const logisticsCapacityLabel = doc.createElement('span');
    logisticsCapacityLabel.className = 'galaxy-logistics-stat__label galaxy-logistics-stat__label--with-icon';
    logisticsCapacityLabel.textContent = 'Fleet Capacity';
    logisticsCapacityLabel.appendChild(createInfoTooltip(
        doc,
        'This is the maximum fleet power the UHF can support.   It is determined by 100 times the number of terraformed worlds, and further multiplied by upgrades.'
    ));
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
    threatTooltip.title = 'Threat is a measure of how seriously the rest of the galaxy views your faction.  The duchies also have a threat factor.  When choosing a target, factions will prioritize higher threat enemies.  At 0 threat, a faction is considered to be not worth targeting.  Any faction that fully controls 40 or more sectors becomes a priority threat, and the galaxy will unite against them until they fall below 40 again.';
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
        mapOperationsLayer: operationsLayer,
        mapOverlay,
        mapState,
        zoomIn,
        zoomOut,
        operationsPanel: operationsCache.operationsPanel,
        operationsEmpty: operationsCache.operationsEmpty,
        operationsForm: operationsCache.operationsForm,
        operationsInput: operationsCache.operationsInput,
        operationsButtons: operationsCache.operationsButtons,
        operationsLaunchButton: operationsCache.operationsLaunchButton,
        operationsAutoCheckbox: operationsCache.operationsAutoCheckbox,
        operationsAutoThresholdInput: operationsCache.operationsAutoThresholdInput,
        operationsProgress: operationsCache.operationsProgress,
        operationsProgressFill: operationsCache.operationsProgressFill,
        operationsProgressLabel: operationsCache.operationsProgressLabel,
        operationsCostValue: operationsCache.operationsCostValue,
        operationsDurationRow: operationsCache.operationsDurationRow,
        operationsDurationLabel: operationsCache.operationsDurationLabel,
        operationsDurationValue: operationsCache.operationsDurationValue,
        operationsAvailable: operationsCache.operationsAvailable,
        operationsSummaryItems: operationsCache.operationsSummaryItems,
        operationsStatusMessage: operationsCache.operationsStatusMessage,
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
        attackPlaceholder,
        attackList,
        attackEntries: new Map(),
        defenseSection,
        defenseWarning,
        defenseForm,
        defenseSectorLabel,
        defenseCapacityValue,
        defenseReservationValue,
        defenseAssignedValue,
        defenseEffectiveValue,
        defenseRemainingValue,
        defenseInput,
        defenseButtons,
        sectorContent,
        sectorDetails: null,
        hexElements,
        hexLookup,
        operationArrows: new Map(),
        selectedHex: null,
        selectedSector: null
    };
    galaxyOperationUI.setContext({ manager: galaxyManager, cache: galaxyUICache });

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

    const sectorPanel = galaxyUICache.sectorContent;
    if (sectorPanel && !sectorPanel.textContent) {
        sectorPanel.textContent = sectorPanel.dataset.emptyMessage || 'Stand by.';
    }
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

function clearIncomingAttackPanel(cache) {
    const list = cache?.attackList;
    if (list) {
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
    }
    cache?.attackEntries?.clear?.();
    const panel = cache?.attackContent;
    const placeholder = cache?.attackPlaceholder;
    if (panel) {
        panel.classList.remove('is-populated');
    }
    if (placeholder) {
        const message = panel?.dataset?.emptyMessage || 'No hostiles detected.';
        placeholder.textContent = message;
        placeholder.classList.remove('is-hidden');
    }
}

function parseGalaxySectorKey(key) {
    if (!key) {
        return null;
    }
    const parts = String(key).split(',');
    if (parts.length !== 2) {
        return null;
    }
    const q = Number(parts[0]);
    const r = Number(parts[1]);
    if (!Number.isFinite(q) || !Number.isFinite(r)) {
        return null;
    }
    return { q, r };
}

function handleIncomingAttackSectorClick(event) {
    const button = event?.currentTarget;
    if (!button || !galaxyUICache) {
        return;
    }
    const key = button.dataset ? button.dataset.sectorKey : '';
    if (!key) {
        return;
    }
    const manager = galaxyManager;
    if (!manager || !manager.enabled) {
        return;
    }
    const coordinates = parseGalaxySectorKey(key);
    if (!coordinates) {
        return;
    }
    const lookup = galaxyUICache.hexLookup;
    const hex = lookup ? lookup.get(key) : null;
    selectGalaxySector({ q: coordinates.q, r: coordinates.r, hex });
}

function ensureAttackCard(cache, attack) {
    const entries = cache.attackEntries;
    const key = attack.sectorKey || attack.attackerId;
    if (!entries || !key) {
        return null;
    }
    if (entries.has(key)) {
        return entries.get(key);
    }
    const doc = cache.attackContent?.ownerDocument;
    if (!doc) {
        return null;
    }
    const card = doc.createElement('div');
    card.className = 'galaxy-attack-card';

    const header = doc.createElement('div');
    header.className = 'galaxy-attack-card__header';
    const factionNode = doc.createElement('span');
    factionNode.className = 'galaxy-attack-card__faction';
    const timerNode = doc.createElement('span');
    timerNode.className = 'galaxy-attack-card__timer';
    header.appendChild(factionNode);
    header.appendChild(timerNode);

    const details = doc.createElement('div');
    details.className = 'galaxy-attack-card__details';
    const powerNode = doc.createElement('span');
    powerNode.className = 'galaxy-attack-card__power';
    const sectorNode = doc.createElement('span');
    sectorNode.className = 'galaxy-attack-card__sector';
    const sectorLabel = doc.createElement('span');
    sectorLabel.className = 'galaxy-attack-card__sector-label';
    sectorLabel.textContent = 'Target: ';
    const sectorButton = doc.createElement('button');
    sectorButton.type = 'button';
    sectorButton.className = 'galaxy-attack-card__sector-button';
    sectorButton.addEventListener('click', handleIncomingAttackSectorClick);
    sectorNode.appendChild(sectorLabel);
    sectorNode.appendChild(sectorButton);
    details.appendChild(powerNode);
    details.appendChild(sectorNode);

    card.appendChild(header);
    card.appendChild(details);

    const entry = {
        element: card,
        factionNode,
        timerNode,
        powerNode,
        sectorNode,
        sectorButton
    };
    entries.set(key, entry);
    return entry;
}

function updateIncomingAttackPanel(manager, cache) {
    if (!cache?.attackContent || !cache.attackList) {
        return;
    }
    const getIncomingAttacks = globalThis.GalaxyFactionUI && globalThis.GalaxyFactionUI.getIncomingAttacks;
    const incomingAttacks = getIncomingAttacks ? getIncomingAttacks(manager) : [];
    const seen = new Set();

    for (let index = 0; index < incomingAttacks.length; index += 1) {
        const attack = incomingAttacks[index];
        const record = ensureAttackCard(cache, attack);
        if (!record) {
            continue;
        }
        record.factionNode.textContent = attack.attackerName;
        record.timerNode.textContent = formatAttackCountdown(attack.remainingMs);
        const formattedPower = formatFleetValue(attack.power);
        record.powerNode.textContent = `Power: ${formattedPower}`;
        if (record.sectorButton) {
            const sectorKey = attack.sectorKey || '';
            const sectorName = attack.sectorName || 'Unknown sector';
            record.sectorButton.textContent = sectorName;
            record.sectorButton.dataset.sectorKey = sectorKey;
            record.sectorButton.disabled = sectorKey === '';
            if (sectorKey) {
                record.sectorButton.setAttribute('aria-label', `View sector ${sectorName}`);
            } else {
                record.sectorButton.removeAttribute('aria-label');
            }
        }
        if (record.element.parentNode !== cache.attackList) {
            cache.attackList.appendChild(record.element);
        }
        seen.add(attack.sectorKey || attack.attackerId);
    }

    const entries = cache.attackEntries;
    if (entries) {
        Array.from(entries.keys()).forEach((key) => {
            if (seen.has(key)) {
                const existing = entries.get(key);
                if (existing && existing.element.parentNode !== cache.attackList) {
                    cache.attackList.appendChild(existing.element);
                }
                return;
            }
            const existing = entries.get(key);
            if (existing?.element?.parentNode) {
                existing.element.parentNode.removeChild(existing.element);
            }
            entries.delete(key);
        });
    }

    const hasEntries = incomingAttacks.length > 0;
    globalThis?.setSpaceIncomingAttackWarning?.(hasEntries);
    const defenseVisible = cache.defenseForm ? !cache.defenseForm.classList.contains('is-hidden') : false;
    if (cache.attackContent) {
        cache.attackContent.classList.toggle('is-populated', hasEntries || defenseVisible);
    }
    if (cache.attackPlaceholder) {
        if (hasEntries) {
            cache.attackPlaceholder.textContent = '';
            cache.attackPlaceholder.classList.add('is-hidden');
        } else {
            const message = cache.attackContent?.dataset?.emptyMessage || 'No hostiles detected.';
            cache.attackPlaceholder.textContent = message;
            cache.attackPlaceholder.classList.remove('is-hidden');
        }
    }
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
    updateGalaxyUI({ force: true });
}

function updateGalaxyUI(options = {}) {
    const cache = galaxyUICache || cacheGalaxyElements();
    if (!cache) {
        return;
    }

    const { force = false } = options;
    const subtabActive = isGalaxySubtabActive();

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
        clearOperationArrows(cache);
        updateLogisticsDisplay(null, cache);
        updateFleetShopDisplay(null, cache);
        clearIncomingAttackPanel(cache);
        refreshEmptyStates();
        return;
    }

    if (!force && !subtabActive) {
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
    updateIncomingAttackPanel(manager, cache);
    updateSectorDefenseSection();
    updateGalaxyHexControlColors(manager, cache);
    galaxyOperationUI?.updateOperationArrows?.(manager, cache);
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
