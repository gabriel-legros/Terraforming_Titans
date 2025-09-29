const HEX_RADIUS = 6;
const HEX_BASE_SIZE = 44;
const HEX_TILE_SCALE = 0.94;
const HEX_MIN_SCALE = 0.3;
const HEX_MAX_SCALE = 2.5;
const HEX_SCALE_STEP = 1.25;
const SQRT3 = Math.sqrt(3);

let galaxyUICache = null;
const supportsPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;
let legacyPanAttached = false;

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

function createGalaxyHex(doc, { q, r, x, y }, size, offsets) {
    const scaledSize = size * HEX_TILE_SCALE;
    const { width: displayWidth, height: displayHeight } = getHexDimensions(scaledSize);
    const hex = doc.createElement('button');
    hex.className = 'galaxy-hex';
    hex.type = 'button';
    hex.dataset.q = q;
    hex.dataset.r = r;
    const displayName = formatSectorName(q, r);
    hex.setAttribute('aria-label', displayName === 'Core' ? 'Core sector' : `Sector ${displayName}`);
    hex.dataset.displayName = displayName;
    hex.style.width = `${displayWidth}px`;
    hex.style.height = `${displayHeight}px`;
    const left = Math.round(x + offsets.x - (displayWidth / 2));
    const top = Math.round(y + offsets.y - (displayHeight / 2));
    hex.style.left = `${left}px`;
    hex.style.top = `${top}px`;

    const label = doc.createElement('span');
    label.className = 'galaxy-hex__label';
    label.textContent = displayName;
    hex.appendChild(label);

    return hex;
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
    grid.hexes.forEach((hexData) => {
        const hex = createGalaxyHex(doc, hexData, baseSize, offsets);
        fragment.appendChild(hex);
    });
    return {
        fragment,
        contentWidth: grid.width,
        contentHeight: grid.height
    };
}

function resetGalaxyHexStyles(cache) {
    if (!cache || !cache.hexElements) {
        return;
    }
    cache.hexElements.forEach((hex) => {
        hex.style.removeProperty('--galaxy-hex-background');
        hex.style.removeProperty('--galaxy-hex-background-hover');
        hex.style.removeProperty('--galaxy-hex-border');
        hex.classList.remove('is-controlled');
        hex.dataset.controller = '';
        hex.dataset.controllerName = '';
    });
}

function updateGalaxyHexControlColors(manager, cache) {
    if (!manager || !cache || !cache.hexElements) {
        return;
    }
    cache.hexElements.forEach((hex) => {
        const q = Number(hex.dataset.q);
        const r = Number(hex.dataset.r);
        if (!Number.isFinite(q) || !Number.isFinite(r)) {
            return;
        }
        const controller = manager.getSectorController(q, r);
        if (!controller) {
            hex.style.removeProperty('--galaxy-hex-background');
            hex.style.removeProperty('--galaxy-hex-background-hover');
            hex.style.removeProperty('--galaxy-hex-border');
            hex.classList.remove('is-controlled');
            hex.dataset.controller = '';
            hex.dataset.controllerName = '';
            return;
        }
        const { faction } = controller;
        hex.style.setProperty('--galaxy-hex-background', faction.getMapBackground());
        hex.style.setProperty('--galaxy-hex-background-hover', faction.getHoverBackground());
        hex.style.setProperty('--galaxy-hex-border', faction.getBorderColor());
        hex.classList.add('is-controlled');
        hex.dataset.controller = faction.id;
        hex.dataset.controllerName = faction.name;
    });
}

function updateGalaxyMapTransform(cache) {
    if (!cache || !cache.mapContent) {
        return;
    }
    const { mapContent, mapState } = cache;
    mapContent.style.transform = `translate(${mapState.offsetX}px, ${mapState.offsetY}px) scale(${mapState.scale})`;
}

function centerGalaxyMap(cache) {
    if (!cache || !cache.mapWrapper) {
        return;
    }
    const { mapWrapper, mapState } = cache;
    mapState.scale = 1;
    mapState.offsetX = -120;
    mapState.offsetY = -220;
    updateGalaxyMapTransform(cache);
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
    if (event.target && event.target.closest('.galaxy-map-zoom')) {
        return;
    }

    const coords = extractClientCoordinates(event);
    if (!coords) {
        return;
    }

    const pointerId = getPointerId(event);
    cache.mapState.isPanning = true;
    cache.mapState.pointerId = pointerId;
    cache.mapState.panStartX = coords.x;
    cache.mapState.panStartY = coords.y;
    cache.mapState.startOffsetX = cache.mapState.offsetX;
    cache.mapState.startOffsetY = cache.mapState.offsetY;

    if (supportsPointerEvents && typeof event.pointerId === 'number') {
        canvas.setPointerCapture(event.pointerId);
    } else {
        attachDocumentPanListeners();
    }

    canvas.classList.add('is-panning');
    if (event.cancelable) {
        event.preventDefault();
    }
}

function moveGalaxyMapPan(event) {
    if (!galaxyUICache || !galaxyUICache.mapState || !galaxyUICache.mapState.isPanning) {
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

    const scale = cache.mapState.scale || 1;
    const deltaX = (coords.x - cache.mapState.panStartX) / scale;
    const deltaY = (coords.y - cache.mapState.panStartY) / scale;
    cache.mapState.offsetX = cache.mapState.startOffsetX + deltaX;
    cache.mapState.offsetY = cache.mapState.startOffsetY + deltaY;
    updateGalaxyMapTransform(cache);

    if (event.cancelable) {
        event.preventDefault();
    }
}

function endGalaxyMapPan(event) {
    if (!galaxyUICache || !galaxyUICache.mapState || !galaxyUICache.mapState.isPanning) {
        return;
    }
    const pointerId = getPointerId(event);
    if (pointerId !== galaxyUICache.mapState.pointerId) {
        return;
    }

    galaxyUICache.mapState.isPanning = false;
    galaxyUICache.mapState.pointerId = null;

    const canvas = galaxyUICache.mapCanvas;
    if (supportsPointerEvents && canvas && typeof event.pointerId === 'number' && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
    }
    detachDocumentPanListeners();
    canvas.classList.remove('is-panning');

    if (event.cancelable) {
        event.preventDefault();
    }
}

function handleGalaxyMapWheel(event) {
    if (!galaxyUICache) {
        return;
    }
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 / HEX_SCALE_STEP : HEX_SCALE_STEP;
    const rect = galaxyUICache.mapCanvas.getBoundingClientRect();
    adjustGalaxyMapScale(direction, {
        focalX: event.clientX - rect.left,
        focalY: event.clientY - rect.top
    });
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

    const sectorDetails = createGalaxySection(doc, 'Sector Details', 'Select a sector on the map to view control, bonuses, and ongoing effects.');
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
    mapContent.style.width = `${hexBuild.contentWidth}px`;
    mapContent.style.height = `${hexBuild.contentHeight}px`;
    mapContent.appendChild(hexBuild.fragment);
    const hexElements = Array.from(mapContent.querySelectorAll('.galaxy-hex'));

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
        initialized: false
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
    mapCanvas.addEventListener('wheel', handleGalaxyMapWheel, { passive: false });

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

    const operations = createGalaxySection(doc, 'Ongoing Operations', 'Assign fleets, schedule maneuvers, and monitor mission timers.');
    operations.section.classList.add('galaxy-section--operations');
    const operationsList = doc.createElement('ul');
    operationsList.className = 'galaxy-list galaxy-list--operations';
    operationsList.dataset.emptyMessage = 'No operations scheduled.';
    const operationsPlaceholder = doc.createElement('li');
    operationsPlaceholder.className = 'galaxy-list__placeholder';
    operationsPlaceholder.textContent = operationsList.dataset.emptyMessage;
    operationsList.appendChild(operationsPlaceholder);
    operations.body.appendChild(operationsList);

    const incomingAttacks = createGalaxySection(doc, 'Incoming Attack', 'Monitor hostile fleets en route to your sectors.');
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

    const logistics = createGalaxySection(doc, 'Logistics', 'Coordinate supply lines, gate calibrations, and strategic reserves.');
    logistics.section.classList.add('galaxy-section--logistics');
    const logisticsList = doc.createElement('ul');
    logisticsList.className = 'galaxy-list galaxy-list--logistics';
    logisticsList.dataset.emptyMessage = 'Logistics queue idle.';
    const logisticsPlaceholder = doc.createElement('li');
    logisticsPlaceholder.className = 'galaxy-list__placeholder';
    logisticsPlaceholder.textContent = logisticsList.dataset.emptyMessage;
    logisticsList.appendChild(logisticsPlaceholder);
    logistics.body.appendChild(logisticsList);

    const upgrades = createGalaxySection(doc, 'Upgrades', 'Enhance Warp Gate Command with new tech and facilities.');
    upgrades.section.classList.add('galaxy-section--upgrades');
    const upgradesList = doc.createElement('ul');
    upgradesList.className = 'galaxy-list galaxy-list--upgrades';
    upgradesList.dataset.emptyMessage = 'No upgrades unlocked yet.';
    const upgradesPlaceholder = doc.createElement('li');
    upgradesPlaceholder.className = 'galaxy-list__placeholder';
    upgradesPlaceholder.textContent = upgradesList.dataset.emptyMessage;
    upgradesList.appendChild(upgradesPlaceholder);
    upgrades.body.appendChild(upgradesList);

    thirdRow.appendChild(logistics.section);
    thirdRow.appendChild(upgrades.section);

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
        operationsList,
        operationsPlaceholder,
        logisticsList,
        logisticsPlaceholder,
        upgradesList,
        upgradesPlaceholder,
        attackContent,
        sectorContent,
        hexElements
    };

    refreshEmptyStates();
    centerGalaxyMap(galaxyUICache);

    return galaxyUICache;
}

function refreshEmptyStates() {
    if (!galaxyUICache) {
        return;
    }

    const listData = [
        [galaxyUICache.operationsList, galaxyUICache.operationsPlaceholder],
        [galaxyUICache.logisticsList, galaxyUICache.logisticsPlaceholder],
        [galaxyUICache.upgradesList, galaxyUICache.upgradesPlaceholder]
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
        refreshEmptyStates();
        return;
    }

    cache.mapCanvas.classList.remove('is-disabled');

    if (cache.mapCanvas.dataset.ready !== 'true') {
        cache.mapCanvas.dataset.ready = 'true';
        cache.mapOverlay.textContent = 'Initializing galactic coordinates...';
        cache.mapOverlay.classList.add('is-visible');
        centerGalaxyMap(cache);
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

    updateGalaxyHexControlColors(manager, cache);
    refreshEmptyStates();
}

if (typeof window !== 'undefined') {
    window.initializeGalaxyUI = initializeGalaxyUI;
    window.updateGalaxyUI = updateGalaxyUI;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeGalaxyUI, updateGalaxyUI };
}
