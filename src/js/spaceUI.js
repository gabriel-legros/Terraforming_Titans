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
let spaceGalaxyTabVisible = false;
let spaceSubtabManager = null;
// Cache the last rendered world so we can skip redundant updates
let lastWorldKey = null;
let lastWorldSeed = null;
let spaceStatUniqueValueEl = null;
let spaceStatEffectiveValueEl = null;
let spaceStatUniqueTooltipEl = null;
let spaceStatEffectiveTooltipEl = null;

const galaxyTabElements = { button: null, content: null };
const spaceTabAlertElements = { button: null, warning: null };

// Cached travel warning popup elements
let travelWarningOverlay = null;
let travelWarningMessageEl = null;
let travelWarningConfirmBtn = null;
let travelWarningCancelBtn = null;
let travelWarningHintContainer = null;
let travelWarningHintToggle = null;
let travelWarningHintTitleEl = null;
let travelWarningHintBodyEl = null;

function setTravelWarningHintVisibility(isOpen) {
    if (!travelWarningHintContainer) return;
    travelWarningHintContainer.dataset.open = isOpen ? 'true' : 'false';
    if (travelWarningHintBodyEl) {
        travelWarningHintBodyEl.style.display = isOpen ? 'block' : 'none';
    }
    if (travelWarningHintToggle) {
        travelWarningHintToggle.textContent = isOpen ? 'Hide Hint' : 'Show Hint';
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

function setSpaceIncomingAttackWarning(isActive) {
    const doc = globalThis.document;
    if (!doc) {
        return;
    }
    const { warning } = cacheSpaceTabWarningElements(doc);
    if (!warning) {
        return;
    }
    if (isActive) {
        warning.classList.add('is-visible');
        warning.setAttribute('aria-hidden', 'false');
        warning.setAttribute('role', 'img');
        warning.setAttribute('aria-label', 'Incoming attack detected in UHF sector');
        warning.title = 'Incoming attack detected in UHF sector';
        return;
    }
    warning.classList.remove('is-visible');
    warning.setAttribute('aria-hidden', 'true');
    warning.removeAttribute('role');
    warning.removeAttribute('aria-label');
    warning.removeAttribute('title');
}

globalThis.setSpaceIncomingAttackWarning = setSpaceIncomingAttackWarning;

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
    if (!travelWarningOverlay) {
        travelWarningOverlay = document.createElement('div');
        travelWarningOverlay.id = 'travel-warning-popup';
        travelWarningOverlay.style.position = 'fixed';
        travelWarningOverlay.style.top = '0';
        travelWarningOverlay.style.left = '0';
        travelWarningOverlay.style.width = '100%';
        travelWarningOverlay.style.height = '100%';
        travelWarningOverlay.style.background = 'rgba(0,0,0,0.5)';
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
        travelWarningHintTitleEl.textContent = 'Hint';
        hintHeader.appendChild(travelWarningHintTitleEl);

        travelWarningHintToggle = document.createElement('button');
        travelWarningHintToggle.type = 'button';
        travelWarningHintToggle.className = 'travel-warning-hint-toggle';
        travelWarningHintToggle.textContent = 'Show Hint';

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
        travelWarningConfirmBtn.textContent = 'Travel';
        btnRow.appendChild(travelWarningConfirmBtn);

        travelWarningCancelBtn = document.createElement('button');
        travelWarningCancelBtn.id = 'travel-warning-cancel';
        travelWarningCancelBtn.textContent = 'Cancel Travel';
        btnRow.appendChild(travelWarningCancelBtn);

        win.appendChild(btnRow);
        travelWarningOverlay.appendChild(win);
        document.body.appendChild(travelWarningOverlay);
    }
    const warning = warningData || { message: '' };
    travelWarningMessageEl.textContent = warning.message || '';

    if (warning.hint && warning.hint.body) {
        travelWarningHintContainer.style.display = 'block';
        travelWarningHintTitleEl.textContent = warning.hint.title || 'Hint';
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
        if (id === 'space-galaxy' && typeof updateGalaxyUI === 'function') {
            updateGalaxyUI({ force: true });
        }
    });
}

function activateSpaceSubtab(subtabId) {
    if (spaceSubtabManager) {
        spaceSubtabManager.activate(subtabId);
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
    cacheGalaxyTabElements();
    cacheSpaceTabWarningElements(document);
    setSpaceIncomingAttackWarning(false);
    if (typeof galaxyManager !== 'undefined' && galaxyManager && galaxyManager.enabled) {
        showSpaceGalaxyTab();
    } else {
        hideSpaceGalaxyTab();
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
        optionsContainer.innerHTML = '<p style="color: red;">Error: Planet data unavailable.</p>';
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
            <p><strong>Distance:</strong><span>${formatNumber(celestial.distanceFromSun, false, 2)} AU</span></p>
            <p><strong>Gravity:</strong><span>${formatNumber(celestial.gravity, false, 2)} m/s²</span></p>
            <p><strong>Radius:</strong><span>${format(celestial.radius)} km</span></p>
            <p><strong>Status:</strong><span class="planet-status"></span></p>
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
    updateSpaceRandomVisibility();
    updateCurrentWorldUI();
    updateSpaceStatsUI();

    const statusContainer = document.getElementById('travel-status');
    const allPlanetData = typeof planetParameters !== 'undefined' ? planetParameters : null;
    if (!allPlanetData) return;

    const currentKey = _spaceManagerInstance.getCurrentPlanetKey();
    const currentSeed = _spaceManagerInstance.getCurrentRandomSeed ? _spaceManagerInstance.getCurrentRandomSeed() : null;
    const isTerraformed = _spaceManagerInstance.isPlanetTerraformed(currentKey);
    const canChangePlanet = currentSeed !== null || isTerraformed;

    if (statusContainer) {
        const showWarning = currentSeed === null && !isTerraformed;
        statusContainer.style.display = showWarning ? 'flex' : 'none';
        statusContainer.classList.toggle('hidden', !showWarning);
        statusContainer.textContent = showWarning ? 'Terraform this world before charting a new course.' : '';
    }

    Object.entries(allPlanetData).forEach(([key, data]) => {
        const ui = planetUIElements[key];
        if (!ui) return;

        const isEnabled = _spaceManagerInstance.isPlanetEnabled(key);
        ui.container.style.display = isEnabled ? 'flex' : 'none';

        const cardIsCurrent = key === currentKey;
        const cardTerraformed = _spaceManagerInstance.isPlanetTerraformed(key);
        const cardLocked = !cardIsCurrent && !cardTerraformed && !canChangePlanet;

        ui.container.classList.toggle('current', cardIsCurrent);
        ui.container.classList.toggle('terraformed', cardTerraformed);
        ui.container.classList.toggle('disabled', cardLocked);

        ui.nameHeading.textContent = data.name;
        ui.statusSpan.textContent = cardTerraformed ? 'Terraforming Complete' : 'Terraforming pending';

        if (cardIsCurrent) {
            ui.button.textContent = 'Current Location';
            ui.button.disabled = true;
            ui.button.title = `You are currently at ${data.name}.`;
        } else if (cardTerraformed) {
            ui.button.textContent = 'Already Terraformed';
            ui.button.disabled = true;
            ui.button.title = `${data.name} has already been terraformed.`;
        } else {
            ui.button.textContent = `Select ${data.name}`;
            ui.button.disabled = !canChangePlanet;
            ui.button.title = canChangePlanet ? `Travel to ${data.name}` : 'Finish terraforming before traveling';
        }
    });
}

function updateSpaceStatsUI() {
    if (!spaceStatUniqueValueEl || !spaceStatEffectiveValueEl) {
        return;
    }
    const uniqueCount = _spaceManagerInstance.getUnmodifiedTerraformedWorldCount();
    const effectiveCount = _spaceManagerInstance.getTerraformedPlanetCount();
    spaceStatUniqueValueEl.textContent = uniqueCount;
    spaceStatEffectiveValueEl.textContent = effectiveCount;
    const galaxyUnlocked = typeof galaxyManager !== 'undefined' && galaxyManager && galaxyManager.enabled;
    if (spaceStatUniqueTooltipEl) {
        const uniqueBase = 'Counts every distinct story world and saved random seed you have fully terraformed. Ignores all other bonuses.';
        spaceStatUniqueTooltipEl.title = `${uniqueBase}`;
    }
    if (spaceStatEffectiveTooltipEl) {
        const effectiveBase = 'Includes worlds from other sources. This value influence advanced research, Solis rewards, mega structure expansion speed, and export caps.';
        const effectiveGalaxy = galaxyUnlocked ? ' With galaxy unlocked, this value also determines fleet capacity.' : '';
        spaceStatEffectiveTooltipEl.title = `${effectiveBase}${effectiveGalaxy}`;
    }
}

// Handle click events for selecting planets
document.addEventListener('click', function(evt){
    const btn = evt.target.closest('.select-planet-button');
    if(btn){
        const key = btn.dataset.planetKey;
        selectPlanet(key);
    }
});

/**
 * Select a planet and reset the game state for it.
 * @param {string} planetKey
 */
function selectPlanet(planetKey, force){
    if(!_spaceManagerInstance) {
        console.error('SpaceManager not initialized');
        return;
    }
    const currentKey = _spaceManagerInstance.getCurrentPlanetKey();
    const currentSeed = _spaceManagerInstance.getCurrentRandomSeed ? _spaceManagerInstance.getCurrentRandomSeed() : null;
    if(currentSeed === null && !_spaceManagerInstance.isPlanetTerraformed(currentKey)) {
        console.warn('Cannot travel until current planet is terraformed.');
        return;
    }
    if(!_spaceManagerInstance.isPlanetEnabled(planetKey)) {
        console.warn('Planet not yet available.');
        return;
    }
    if(_spaceManagerInstance.isPlanetTerraformed(planetKey)) {
        console.warn('Target planet already terraformed.');
        return;
    }
    if(!force && planetParameters[planetKey]?.travelWarning){
        showTravelWarningPopup(planetParameters[planetKey].travelWarning, () => selectPlanet(planetKey, true));
        return;
    }
    const storageState = _spaceManagerInstance.prepareForTravel();

    if(!_spaceManagerInstance.changeCurrentPlanet(planetKey)) return;

    // World has changed, invalidate cached details before rebuilding UI
    resetCurrentWorldCache();

    const firstVisit = _spaceManagerInstance.visitPlanet(planetKey);
    const departingTerraformed = _spaceManagerInstance.isPlanetTerraformed(currentKey);
    const destinationTerraformed = _spaceManagerInstance.isPlanetTerraformed(planetKey);
    if(firstVisit && departingTerraformed && !destinationTerraformed && typeof skillManager !== 'undefined' && skillManager){
        skillManager.skillPoints += 1;
        if (typeof notifySkillPointGained === 'function') {
            notifySkillPointGained(1);
        }
    }

    if(planetParameters[planetKey]){
        defaultPlanet = planetKey;
        currentPlanetParameters = planetParameters[planetKey];
    }

    initializeGameState({preserveManagers: true, preserveJournal: true});

    if (typeof openTerraformingWorldTab === 'function') {
      openTerraformingWorldTab();
    }
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
            wrapper.innerHTML = renderWorldDetail(data, seedArg);
            const eqBtn = wrapper.querySelector('#rwg-equilibrate-btn');
            if (eqBtn) {
                eqBtn.nextElementSibling?.remove();
                eqBtn.remove();
            }
            wrapper.querySelector('#rwg-travel-btn')?.remove();
            wrapper.querySelector('#rwg-travel-warning')?.remove();
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
        } else {
            const detailsContent = detailsBox.querySelector('.details-content') || detailsBox;
            detailsContent.textContent = '';
        }
    }
}
