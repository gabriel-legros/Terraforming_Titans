// spaceUI.js

// Store reference to the SpaceManager instance
let _spaceManagerInstance = null;
// Cache of DOM nodes for each planet keyed by planet id
const planetUIElements = {};
// Track whether the space UI has been generated already
if (typeof SubtabManager === 'undefined') {
    if (typeof require === 'function') {
        SubtabManager = require('./subtab-manager.js');
    } else if (typeof window !== 'undefined') {
        SubtabManager = window.SubtabManager;
    }
}
let spaceUIInitialized = false;
// Track visibility of the Random subtab
let spaceRandomTabVisible = false;
let spaceAtlasTabVisible = false;
let spaceGalaxyTabVisible = false;
let spaceSubtabManager = null;
// Cache the last rendered world so we can skip redundant updates
let lastWorldKey = null;
let lastWorldSeed = null;
let spaceStatUniqueValueEl = null;
let spaceStatEffectiveValueEl = null;
let spaceStatUniqueTooltipEl = null;
let spaceStatEffectiveTooltipEl = null;
let spaceStatUniqueTooltipContentEl = null;
let spaceStatEffectiveTooltipContentEl = null;
let spaceStatOneillCardEl = null;
let spaceStatOneillValueEl = null;
let spaceStatOneillTooltipEl = null;
let spaceStatOneillRateEl = null;
let spaceStatOneillTooltipContentEl = null;

const atlasTabElements = { button: null, content: null };
const galaxyTabElements = { button: null, content: null };
const spaceTabAlertElements = { button: null, warning: null, alert: null, storyAlert: null };
let spaceTabAlertNeeded = false;
let spaceStoryAlertNeeded = false;

// Cached travel warning popup elements
let travelWarningOverlay = null;
let travelWarningMessageEl = null;
let travelWarningConfirmBtn = null;
let travelWarningCancelBtn = null;
let travelWarningHintContainer = null;
let travelWarningHintToggle = null;
let travelWarningHintTitleEl = null;
let travelWarningHintBodyEl = null;

function getSpaceUIText(path, fallback, vars) {
    try {
        return t(`ui.space.${path}`, vars, fallback);
    } catch (error) {
        if (!vars) {
            return fallback;
        }
        let text = fallback;
        Object.keys(vars).forEach((key) => {
            text = text.replaceAll(`{${key}}`, String(vars[key]));
        });
        return text;
    }
}

function setTravelWarningHintVisibility(isOpen) {
    if (!travelWarningHintContainer) return;
    travelWarningHintContainer.dataset.open = isOpen ? 'true' : 'false';
    if (travelWarningHintBodyEl) {
        travelWarningHintBodyEl.style.display = isOpen ? 'block' : 'none';
    }
    if (travelWarningHintToggle) {
        travelWarningHintToggle.textContent = isOpen
            ? getSpaceUIText('travelWarning.hideHint', 'Hide Hint')
            : getSpaceUIText('travelWarning.showHint', 'Show Hint');
        travelWarningHintToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
}

function showSpaceRandomTab() {
    spaceRandomTabVisible = true;
    if (spaceSubtabManager) {
        spaceSubtabManager.show('space-random');
    } else {
        const tab = document.querySelector('[data-subtab="space-random"]');
        const content = document.getElementById('space-random');
        if (tab) tab.classList.remove('hidden');
        if (content) content.classList.remove('hidden');
    }
}

function hideSpaceRandomTab() {
    spaceRandomTabVisible = false;
    if (spaceSubtabManager) {
        spaceSubtabManager.hide('space-random');
    } else {
        const tab = document.querySelector('[data-subtab="space-random"]');
        const content = document.getElementById('space-random');
        if (tab) tab.classList.add('hidden');
        if (content) content.classList.add('hidden');
    }
}

function cacheAtlasTabElements() {
    if (typeof document === 'undefined') {
        return atlasTabElements;
    }
    if (!atlasTabElements.button || !atlasTabElements.button.isConnected) {
        const button = document.querySelector('[data-subtab="space-atlas"]');
        if (button) {
            atlasTabElements.button = button;
        }
    }
    if (!atlasTabElements.content || !atlasTabElements.content.isConnected) {
        const content = document.getElementById('space-atlas');
        if (content) {
            atlasTabElements.content = content;
        }
    }
    return atlasTabElements;
}

function cacheGalaxyTabElements() {
    if (typeof document === 'undefined') {
        return galaxyTabElements;
    }
    if (!galaxyTabElements.button || !galaxyTabElements.button.isConnected) {
        const button = document.querySelector('[data-subtab="space-galaxy"]');
        if (button) {
            galaxyTabElements.button = button;
        }
    }
    if (!galaxyTabElements.content || !galaxyTabElements.content.isConnected) {
        const content = document.getElementById('space-galaxy');
        if (content) {
            galaxyTabElements.content = content;
        }
    }
    return galaxyTabElements;
}

function cacheSpaceTabWarningElements(doc) {
    if (!doc) {
        return spaceTabAlertElements;
    }
    if (!spaceTabAlertElements.button || !spaceTabAlertElements.button.isConnected) {
        spaceTabAlertElements.button = doc.getElementById('space-tab');
    }
    if (!spaceTabAlertElements.warning || !spaceTabAlertElements.warning.isConnected) {
        spaceTabAlertElements.warning = doc.getElementById('space-attack-warning');
    }
    return spaceTabAlertElements;
}

function updateSpaceAlertUI() {
    const displayTab = (!gameSettings.silenceUnlockAlert && spaceTabAlertNeeded) ? 'inline' : 'none';
    const displayStory = (!gameSettings.silenceUnlockAlert && spaceStoryAlertNeeded) ? 'inline' : 'none';
    spaceTabAlertElements.alert.style.display = displayTab;
    spaceTabAlertElements.storyAlert.style.display = displayStory;
}

function setSpaceTabUnlockAlert(effect) {
    const enabled = effect.value !== false;
    spaceTabAlertNeeded = enabled;
    spaceStoryAlertNeeded = enabled;
    updateSpaceAlertUI();
}

function markSpaceTabAlertViewed() {
    spaceTabAlertNeeded = false;
    updateSpaceAlertUI();
}

function markSpaceStoryAlertViewed() {
    spaceStoryAlertNeeded = false;
    updateSpaceAlertUI();
}

function setSpaceIncomingAttackWarning(isActive, isThreat = true) {
    const doc = document;
    if (!doc) {
        return;
    }
    const { warning } = cacheSpaceTabWarningElements(doc);
    if (!warning) {
        return;
    }
    if (isActive) {
        warning.classList.add('is-visible');
        warning.classList.toggle('is-safe', !isThreat);
        warning.setAttribute('aria-hidden', 'false');
        warning.setAttribute('role', 'img');
        if (isThreat) {
            const warningText = getSpaceUIText('alerts.incomingAttackThreat', 'Incoming attack detected in UHF sector');
            warning.setAttribute('aria-label', warningText);
            warning.title = warningText;
        } else {
            const warningText = getSpaceUIText('alerts.incomingAttackNoChance', 'Incoming attack detected in UHF sector with no current success chance');
            warning.setAttribute('aria-label', warningText);
            warning.title = warningText;
        }
        return;
    }
    warning.classList.remove('is-visible');
    warning.classList.remove('is-safe');
    warning.setAttribute('aria-hidden', 'true');
    warning.removeAttribute('role');
    warning.removeAttribute('aria-label');
    warning.removeAttribute('title');
}

function showSpaceAtlasTab() {
    spaceAtlasTabVisible = true;
    const { button, content } = cacheAtlasTabElements();
    if (spaceSubtabManager) {
        spaceSubtabManager.show('space-atlas');
    } else {
        if (button) button.classList.remove('hidden');
        if (content) content.classList.remove('hidden');
    }
}

function hideSpaceAtlasTab() {
    spaceAtlasTabVisible = false;
    const { button, content } = cacheAtlasTabElements();
    if (spaceSubtabManager) {
        spaceSubtabManager.hide('space-atlas');
    } else {
        if (button) button.classList.add('hidden');
        if (content) content.classList.add('hidden');
    }
}

function showSpaceGalaxyTab() {
    spaceGalaxyTabVisible = true;
    const { button, content } = cacheGalaxyTabElements();
    if (spaceSubtabManager) {
        spaceSubtabManager.show('space-galaxy');
    } else {
        if (button) button.classList.remove('hidden');
        if (content) content.classList.remove('hidden');
    }
    if (typeof initializeGalaxyUI === 'function') {
        initializeGalaxyUI();
    }
    if (typeof updateGalaxyUI === 'function') {
        updateGalaxyUI({ force: true });
    }
}

function hideSpaceGalaxyTab() {
    spaceGalaxyTabVisible = false;
    const { button, content } = cacheGalaxyTabElements();
    if (spaceSubtabManager) {
        spaceSubtabManager.hide('space-galaxy');
    } else {
        if (button) button.classList.add('hidden');
        if (content) content.classList.add('hidden');
    }
}

function showTravelWarningPopup(warningData, onConfirm) {
    if (globalGameIsTraveling || globalGameIsLoadingFromSave) {
        return;
    }
    if (!travelWarningOverlay) {
        travelWarningOverlay = document.createElement('div');
        travelWarningOverlay.id = 'travel-warning-popup';
        travelWarningOverlay.style.position = 'fixed';
        travelWarningOverlay.style.top = '0';
        travelWarningOverlay.style.left = '0';
        travelWarningOverlay.style.width = '100%';
        travelWarningOverlay.style.height = '100%';
        travelWarningOverlay.style.background = 'rgba(0,0,0,0.5)';
        travelWarningOverlay.style.zIndex = '3000';
        travelWarningOverlay.style.display = 'flex';
        travelWarningOverlay.style.alignItems = 'center';
        travelWarningOverlay.style.justifyContent = 'center';

        const win = document.createElement('div');
        win.style.background = '#222';
        win.style.color = '#fff';
        win.style.padding = '16px';
        win.style.border = '1px solid #555';
        win.style.maxWidth = '300px';
        win.style.textAlign = 'center';

        travelWarningMessageEl = document.createElement('div');
        travelWarningMessageEl.className = 'travel-warning-message';
        travelWarningMessageEl.style.marginBottom = '12px';
        win.appendChild(travelWarningMessageEl);

        travelWarningHintContainer = document.createElement('div');
        travelWarningHintContainer.className = 'travel-warning-hint';
        travelWarningHintContainer.style.marginBottom = '12px';
        travelWarningHintContainer.style.textAlign = 'left';
        travelWarningHintContainer.style.display = 'none';

        const hintHeader = document.createElement('div');
        hintHeader.style.display = 'flex';
        hintHeader.style.justifyContent = 'space-between';
        hintHeader.style.alignItems = 'center';

        travelWarningHintTitleEl = document.createElement('span');
        travelWarningHintTitleEl.className = 'travel-warning-hint-title';
        travelWarningHintTitleEl.textContent = getSpaceUIText('travelWarning.hint', 'Hint');
        hintHeader.appendChild(travelWarningHintTitleEl);

        travelWarningHintToggle = document.createElement('button');
        travelWarningHintToggle.type = 'button';
        travelWarningHintToggle.className = 'travel-warning-hint-toggle';
        travelWarningHintToggle.textContent = getSpaceUIText('travelWarning.showHint', 'Show Hint');

        travelWarningHintBodyEl = document.createElement('div');
        travelWarningHintBodyEl.id = 'travel-warning-hint-body';
        travelWarningHintBodyEl.className = 'travel-warning-hint-body';
        travelWarningHintBodyEl.style.marginTop = '8px';
        travelWarningHintBodyEl.style.display = 'none';
        travelWarningHintBodyEl.style.whiteSpace = 'pre-line';

        travelWarningHintToggle.setAttribute('aria-expanded', 'false');
        travelWarningHintToggle.setAttribute('aria-controls', travelWarningHintBodyEl.id);
        travelWarningHintToggle.addEventListener('click', () => {
            const currentState = travelWarningHintContainer.dataset.open === 'true';
            setTravelWarningHintVisibility(!currentState);
        });

        hintHeader.appendChild(travelWarningHintToggle);
        travelWarningHintContainer.appendChild(hintHeader);
        travelWarningHintContainer.appendChild(travelWarningHintBodyEl);
        win.appendChild(travelWarningHintContainer);

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '8px';
        btnRow.style.justifyContent = 'center';

        travelWarningConfirmBtn = document.createElement('button');
        travelWarningConfirmBtn.id = 'travel-warning-confirm';
        travelWarningConfirmBtn.textContent = getSpaceUIText('travelWarning.travel', 'Travel');
        btnRow.appendChild(travelWarningConfirmBtn);

        travelWarningCancelBtn = document.createElement('button');
        travelWarningCancelBtn.id = 'travel-warning-cancel';
        travelWarningCancelBtn.textContent = getSpaceUIText('travelWarning.cancelTravel', 'Cancel Travel');
        btnRow.appendChild(travelWarningCancelBtn);

        win.appendChild(btnRow);
        travelWarningOverlay.appendChild(win);
        document.body.appendChild(travelWarningOverlay);
    }
    const warning = warningData || { message: '' };
    travelWarningMessageEl.textContent = warning.message || '';
    travelWarningConfirmBtn.textContent = warning.confirmLabel || getSpaceUIText('travelWarning.travel', 'Travel');
    travelWarningCancelBtn.textContent = warning.cancelLabel || getSpaceUIText('travelWarning.cancelTravel', 'Cancel Travel');

    if (warning.hint && warning.hint.body) {
        travelWarningHintContainer.style.display = 'block';
        travelWarningHintTitleEl.textContent = warning.hint.title || getSpaceUIText('travelWarning.hint', 'Hint');
        travelWarningHintBodyEl.textContent = warning.hint.body;
        setTravelWarningHintVisibility(false);
    } else if (travelWarningHintContainer) {
        travelWarningHintContainer.style.display = 'none';
        travelWarningHintBodyEl.textContent = '';
        travelWarningHintContainer.dataset.open = 'false';
    }
    travelWarningConfirmBtn.onclick = () => {
        travelWarningOverlay.style.display = 'none';
        onConfirm();
    };
    travelWarningCancelBtn.onclick = () => {
        travelWarningOverlay.style.display = 'none';
    };
    travelWarningOverlay.style.display = 'flex';
}

function getActiveSpecializationProject() {
    const bioworld = projectManager.projects.bioworld;
    if (bioworld.isActive && !bioworld.isCompleted) {
        return bioworld;
    }
    const foundry = projectManager.projects.foundryWorld;
    if (foundry.isActive && !foundry.isCompleted) {
        return foundry;
    }
    const manufacturing = projectManager.projects.manufacturingWorld;
    if (manufacturing.isActive && !manufacturing.isCompleted) {
        return manufacturing;
    }
    return null;
}

function getSpecializationTravelWarningMessage() {
    const project = getActiveSpecializationProject();
    if (!project) {
        return '';
    }
    return getSpaceUIText(
        'travelWarning.specializationInProgress',
        '{name} is still in progress. Leaving now will abandon its progress.',
        { name: project.displayName }
    );
}

function handleCurrentWorldTravelWarnings(onConfirm) {
    if (globalGameIsTraveling || globalGameIsLoadingFromSave) {
        return false;
    }
    const messages = [];
    if (_spaceManagerInstance && !_spaceManagerInstance.isCurrentWorldTerraformed()) {
        messages.push(getSpaceUIText(
            'travelWarning.unterraformedMessage',
            'This world is not yet fully terraformed. Leaving now will abandon its progress.'
        ));
    }
    const specializationMessage = getSpecializationTravelWarningMessage();
    if (specializationMessage) {
        messages.push(specializationMessage);
    }
    if (!messages.length) {
        return false;
    }
    showTravelWarningPopup({
        message: messages.join('\n\n'),
    }, onConfirm);
    return true;
}

function updateSpaceRandomVisibility() {
    if (!_spaceManagerInstance) return;
    if (_spaceManagerInstance.randomTabEnabled) {
        if (!spaceRandomTabVisible) {
            showSpaceRandomTab();
        }
    } else if (spaceRandomTabVisible) {
        hideSpaceRandomTab();
    }
}

function initializeSpaceTabs() {
    if (typeof SubtabManager !== 'function') return;
    spaceSubtabManager = new SubtabManager('.space-subtab', '.space-subtab-content', true);
    spaceSubtabManager.onActivate((id) => {
        if (id === 'space-atlas' && typeof updateAtlasUI === 'function') {
            updateAtlasUI({ force: true });
        }
        if (id === 'space-galaxy' && typeof updateGalaxyUI === 'function') {
            updateGalaxyUI({ force: true });
        }
        if (id === 'space-story') {
            markSpaceStoryAlertViewed();
        }
    });
}

function activateSpaceSubtab(subtabId) {
    if (spaceSubtabManager) {
        spaceSubtabManager.activate(subtabId);
    }
    if (subtabId === 'space-story') {
        markSpaceStoryAlertViewed();
    }
}

// Reset the cached world key and seed so the next update rebuilds the details box
function resetCurrentWorldCache() {
    lastWorldKey = null;
    lastWorldSeed = null;
}

/**
 * Initializes the Space Tab UI elements and stores the SpaceManager instance.
 * @param {SpaceManager} spaceManager - The instance of the SpaceManager.
 */
function initializeSpaceUI(spaceManager) {
    if (!spaceManager || typeof spaceManager.getCurrentPlanetKey !== 'function') {
        console.error("initializeSpaceUI requires a valid SpaceManager instance.");
        return;
    }
    _spaceManagerInstance = spaceManager; // Store the instance for later use
    // Reset cached world details whenever we get a new manager
    resetCurrentWorldCache();
    console.log("Initializing Space UI with SpaceManager reference.");
    initializeSpaceTabs();
    hideSpaceRandomTab();
    hideSpaceAtlasTab();
    cacheAtlasTabElements();
    cacheGalaxyTabElements();
    if (typeof updateArtificialUI === 'function') {
        updateArtificialUI({ force: true });
    }
    cacheSpaceTabWarningElements(document);
    spaceTabAlertElements.alert = document.getElementById('space-tab-alert');
    spaceTabAlertElements.storyAlert = document.getElementById('space-story-alert');
    updateSpaceAlertUI();
    setSpaceIncomingAttackWarning(false);
    if (typeof galaxyManager !== 'undefined' && galaxyManager && galaxyManager.enabled) {
        showSpaceGalaxyTab();
    } else {
        hideSpaceGalaxyTab();
    }
    if (typeof atlasManager !== 'undefined' && atlasManager && atlasManager.enabled) {
        showSpaceAtlasTab();
    } else {
        hideSpaceAtlasTab();
    }

    // If the UI has already been generated, just update with the new instance
    if (spaceUIInitialized) {
        updateSpaceUI();
        return;
    }
    spaceUIInitialized = true;

    const optionsContainer = document.getElementById('planet-selection-options');
    const statusContainer = document.getElementById('travel-status');
    spaceStatUniqueValueEl = document.getElementById('space-stat-unique-value');
    spaceStatEffectiveValueEl = document.getElementById('space-stat-effective-value');
    spaceStatUniqueTooltipEl = document.getElementById('space-stat-unique-tooltip');
    spaceStatEffectiveTooltipEl = document.getElementById('space-stat-effective-tooltip');
    spaceStatOneillCardEl = document.getElementById('space-stat-oneill-card');
    spaceStatOneillValueEl = document.getElementById('space-stat-oneill-value');
    spaceStatOneillTooltipEl = document.getElementById('space-stat-oneill-tooltip');
    spaceStatOneillRateEl = document.getElementById('space-stat-oneill-rate');
    spaceStatUniqueTooltipContentEl = attachDynamicInfoTooltip(spaceStatUniqueTooltipEl, '');
    spaceStatEffectiveTooltipContentEl = attachDynamicInfoTooltip(spaceStatEffectiveTooltipEl, '');
    spaceStatOneillTooltipContentEl = attachDynamicInfoTooltip(spaceStatOneillTooltipEl, '');
    if (typeof setOneillStatsElements === 'function') {
        setOneillStatsElements({
            card: spaceStatOneillCardEl,
            value: spaceStatOneillValueEl,
            rate: spaceStatOneillRateEl,
            tooltip: spaceStatOneillTooltipEl,
            tooltipContent: spaceStatOneillTooltipContentEl
        });
    }

    if (!optionsContainer) {
        console.error("Space UI critical element '#planet-selection-options' not found.");
        return;
    }
    if (statusContainer) {
        statusContainer.innerHTML = '';
        statusContainer.style.display = 'none'; // Hide travel status
    }

    const allPlanetData = typeof planetParameters !== 'undefined' ? planetParameters : null;
    if (!allPlanetData) {
        const error = document.createElement('p');
        error.style.color = 'red';
        error.textContent = getSpaceUIText('storyUi.planetDataUnavailable', 'Error: Planet data unavailable.');
        optionsContainer.replaceChildren(error);
        return;
    }

    const format = typeof formatNumber === 'function' ? formatNumber : (n => n);
    Object.entries(allPlanetData).forEach(([key, data]) => {
        if (!data || !data.celestialParameters || !data.name) return;
        const celestial = data.celestialParameters;

        const planetDiv = document.createElement('div');
        planetDiv.classList.add('planet-option');
        planetDiv.dataset.planetKey = key;

        const nameHeading = document.createElement('h3');
        planetDiv.appendChild(nameHeading);

        const statsDiv = document.createElement('div');
        statsDiv.classList.add('planet-stats');
        statsDiv.innerHTML = `
            <p><strong>${getSpaceUIText('storyUi.distance', 'Distance:')}</strong><span>${formatNumber(celestial.distanceFromSun, false, 2)} AU</span></p>
            <p><strong>${getSpaceUIText('storyUi.gravity', 'Gravity:')}</strong><span>${formatNumber(celestial.gravity, false, 2)} m/s²</span></p>
            <p><strong>${getSpaceUIText('storyUi.radius', 'Radius:')}</strong><span>${format(celestial.radius)} km</span></p>
            <p><strong>${getSpaceUIText('storyUi.status', 'Status:')}</strong><span class="planet-status"></span></p>
        `;
        planetDiv.appendChild(statsDiv);

        const selectButton = document.createElement('button');
        selectButton.classList.add('select-planet-button');
        selectButton.dataset.planetKey = key;
        planetDiv.appendChild(selectButton);

        optionsContainer.appendChild(planetDiv);

        planetUIElements[key] = {
            container: planetDiv,
            nameHeading,
            statusSpan: statsDiv.querySelector('.planet-status'),
            button: selectButton
        };
    });

    updateSpaceUI(); // Perform the initial draw using the stored instance

    const detailsContainer = document.getElementById('current-world-details-container');
    if (detailsContainer) {
        const header = detailsContainer.querySelector('.summary-header');
        const content = detailsContainer.querySelector('.details-content');
        const arrow = detailsContainer.querySelector('.summary-arrow');

        if (header && content && arrow) {
            header.addEventListener('click', () => {
                content.classList.toggle('hidden');
                arrow.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
            });
        }
    }
}

/**
 * Updates the planet selection display in the Space Tab UI.
 * Reads data from global planetParameters and the stored _spaceManagerInstance.
 */

function updateSpaceUI() {
    if (!_spaceManagerInstance) return; // Guard clause
    if (typeof updateArtificialUI === 'function') {
        updateArtificialUI();
    }
    updateSpaceRandomVisibility();
    updateCurrentWorldUI();
    updateSpaceStatsUI();
    updateSpaceAlertUI();

    const statusContainer = document.getElementById('travel-status');
    const allPlanetData = typeof planetParameters !== 'undefined' ? planetParameters : null;
    if (!allPlanetData) return;

    const currentKey = _spaceManagerInstance.getCurrentPlanetKey();
    const isTerraformed = _spaceManagerInstance.isCurrentWorldTerraformed();

    if (statusContainer) {
        const showWarning = !isTerraformed;
        statusContainer.style.display = showWarning ? 'flex' : 'none';
        statusContainer.classList.toggle('hidden', !showWarning);
        statusContainer.textContent = showWarning
            ? getSpaceUIText('storyUi.terraformBeforeTravel', 'Terraform this world before charting a new course.')
            : '';
    }

    Object.entries(allPlanetData).forEach(([key, data]) => {
        const ui = planetUIElements[key];
        if (!ui) return;

        const isEnabled = _spaceManagerInstance.isPlanetEnabled(key);
        ui.container.style.display = isEnabled ? 'flex' : 'none';

        const cardIsCurrent = key === currentKey;
        const cardTerraformed = _spaceManagerInstance.isPlanetTerraformed(key);
        const cardLocked = false;

        ui.container.classList.toggle('current', cardIsCurrent);
        ui.container.classList.toggle('terraformed', cardTerraformed);
        ui.container.classList.toggle('disabled', cardLocked);

        ui.nameHeading.textContent = data.name;
        ui.statusSpan.textContent = cardTerraformed
            ? getSpaceUIText('storyUi.terraformingComplete', 'Terraforming Complete')
            : getSpaceUIText('storyUi.terraformingPending', 'Terraforming pending');

        if (cardIsCurrent) {
            ui.button.textContent = getSpaceUIText('storyUi.currentLocation', 'Current Location');
            ui.button.disabled = true;
            ui.button.title = getSpaceUIText('storyUi.currentLocationTitle', 'You are currently at {name}.', { name: data.name });
        } else if (cardTerraformed) {
            ui.button.textContent = getSpaceUIText('storyUi.alreadyTerraformed', 'Already Terraformed');
            ui.button.disabled = true;
            ui.button.title = getSpaceUIText('storyUi.alreadyTerraformedTitle', '{name} has already been terraformed.', { name: data.name });
        } else {
            ui.button.textContent = getSpaceUIText('storyUi.selectPlanet', 'Select {name}', { name: data.name });
            ui.button.disabled = false;
            ui.button.title = getSpaceUIText('storyUi.travelTo', 'Travel to {name}', { name: data.name });
        }
    });
}

function updateSpaceStatsUI() {
    if (!spaceStatUniqueValueEl || !spaceStatEffectiveValueEl) {
        return;
    }
    const uniqueCount = _spaceManagerInstance.getUnmodifiedTerraformedWorldCount();
    const effectiveCount = _spaceManagerInstance.getTerraformedPlanetCount();
    spaceStatUniqueValueEl.textContent = formatGroupedNumber(uniqueCount, 2, 0);
    spaceStatEffectiveValueEl.textContent = formatGroupedNumber(effectiveCount, 2, 0);
    const galaxyUnlocked = typeof galaxyManager !== 'undefined' && galaxyManager && galaxyManager.enabled;
    if (spaceStatUniqueTooltipEl) {
        const uniqueBase = getSpaceUIText(
            'stats.uniqueTooltip',
            'Counts every distinct story world and terraformed random world you have completed. Ignores all other bonuses.'
        );
        if (spaceStatUniqueTooltipContentEl) {
            spaceStatUniqueTooltipContentEl.textContent = uniqueBase;
        } else {
            spaceStatUniqueTooltipEl.title = uniqueBase;
        }
    }
    if (spaceStatEffectiveTooltipEl) {
        const effectiveBase = getSpaceUIText(
            'stats.effectiveTooltip',
            'Includes worlds from other sources. This value influences advanced research, Solis rewards, mega structure expansion speed, and export caps.'
        );
        const artificialFleetCap = artificialManager?.getFleetCapacityWorldCap?.() || 5;
        const effectiveGalaxy = galaxyUnlocked
            ? ` ${getSpaceUIText(
                'stats.effectiveTooltipGalaxy',
                "With galaxy unlocked, fleet capacity uses an adjusted world count (artificial worlds contribute up to {value} and O'Neill cylinders are ignored).",
                { value: artificialFleetCap }
            )}`
            : '';
        const effectiveTooltipText = `${effectiveBase}${effectiveGalaxy}`;
        if (spaceStatEffectiveTooltipContentEl) {
            spaceStatEffectiveTooltipContentEl.textContent = effectiveTooltipText;
        } else {
            spaceStatEffectiveTooltipEl.title = effectiveTooltipText;
        }
    }
    if (typeof updateOneillCylinderStatsUI === 'function') {
        updateOneillCylinderStatsUI({
            space: _spaceManagerInstance,
            galaxy: typeof galaxyManager !== 'undefined' ? galaxyManager : null
        });
    }
}

// Handle click events for selecting planets
document.addEventListener('click', function(evt){
    const btn = evt.target.closest('.select-planet-button');
    if(btn && btn.dataset.planetKey){
        selectPlanet(btn.dataset.planetKey);
    }
});

/**
 * Select a planet and reset the game state for it.
 * @param {string} planetKey
 */
function selectPlanet(planetKey, force, skipCurrentWorldWarnings){
    if(!_spaceManagerInstance) {
        console.error('SpaceManager not initialized');
        return;
    }
    if (!force && !skipCurrentWorldWarnings && handleCurrentWorldTravelWarnings(() => selectPlanet(planetKey, false, true))) {
        return;
    }
    if(!force && planetParameters[planetKey]?.travelWarning){
        showTravelWarningPopup(planetParameters[planetKey].travelWarning, () => selectPlanet(planetKey, true));
        return;
    }
    const travelled = _spaceManagerInstance.travelToStoryPlanet(planetKey);
    if (!travelled) {
        return;
    }
    resetCurrentWorldCache();

    if (typeof openTerraformingWorldTab === 'function') {
      openTerraformingWorldTab();
    }
    resetGameFrameClock(true);
}

function updateCurrentWorldUI() {
    if (!_spaceManagerInstance) return;
    const key = _spaceManagerInstance.getCurrentPlanetKey();
    const seed = _spaceManagerInstance.getCurrentRandomSeed();
    if (key === lastWorldKey && seed === lastWorldSeed) {
        return;
    }
    lastWorldKey = key;
    lastWorldSeed = seed;

    const nameSpan = document.getElementById('current-world-name');
    const detailsBox = document.getElementById('current-world-details');
    if (nameSpan) {
        nameSpan.textContent = _spaceManagerInstance.getCurrentWorldName();
    }
    if (detailsBox) {
        const data = _spaceManagerInstance.getCurrentWorldOriginal();
        const seedArg = seed === null ? undefined : seed;
        if (data && typeof renderWorldDetail === 'function') {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = renderWorldDetail(data, seedArg, undefined, { showDominion: false });
            const eqBtn = wrapper.querySelector('#rwg-equilibrate-btn');
            if (eqBtn) {
                eqBtn.nextElementSibling?.remove();
                eqBtn.remove();
            }
            wrapper.querySelector('#rwg-travel-btn')?.remove();
            wrapper.querySelector('#rwg-travel-warning')?.remove();
            wrapper.querySelector('#rwg-dominion')?.remove();
            wrapper.querySelector('#rwg-dominion-lore-btn')?.remove();
            wrapper.querySelectorAll('[id]').forEach(el => {
                if(el.id !== 'current-world-details') el.removeAttribute('id')
            });
            if (seedArg === undefined) {
                wrapper.querySelectorAll('.rwg-chip').forEach(chip => {
                    const label = chip.querySelector('.label')?.textContent;
                    if (label === 'Seed' || label === 'Type') {
                        chip.remove();
                    }
                });
            }
            const detailsContent = detailsBox.querySelector('.details-content') || detailsBox;
            detailsContent.replaceChildren(wrapper);
            if (typeof attachPendingRwgTooltips === 'function') {
                attachPendingRwgTooltips(wrapper);
            }
        } else {
            const detailsContent = detailsBox.querySelector('.details-content') || detailsBox;
            detailsContent.textContent = '';
        }
    }
}
