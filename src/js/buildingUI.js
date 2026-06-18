// Subtab functionality to show/hide building categories
if (typeof SubtabManager === 'undefined') {
    if (typeof require === 'function') {
        SubtabManager = require('./subtab-manager.js');
    } else if (typeof window !== 'undefined') {
        SubtabManager = window.SubtabManager;
    }
}
let buildingSubtabManager = null;
const buildingAlertElements = {};

function createBuildingCategoryTabs() {
    const categories = typeof getBuildingCategories === 'function' ? getBuildingCategories() : [];
    if (categories.length === 0) return;

    const subtabsContainer = document.querySelector('.buildings-subtabs');
    const contentWrapper = document.querySelector('.building-subtab-content-wrapper');
    
    if (!subtabsContainer || !contentWrapper) return;

    if (buildingSubtabManager) {
        buildingSubtabManager._unregister();
    }
    const categorySet = new Set(categories.map(category => `${category}-buildings`));

    // Create tabs and content for each category
    categories.forEach(category => {
        const categoryId = `${category}-buildings`;
        const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
        
        // Create tab button
        let tab = document.getElementById(`${categoryId}-tab`);
        if (!tab) {
            tab = document.createElement('div');
            tab.id = `${categoryId}-tab`;
            tab.className = 'building-subtab';
            tab.dataset.subtab = categoryId;
            const label = document.createTextNode(categoryLabel);
            const alert = document.createElement('span');
            alert.id = `${categoryId}-alert`;
            alert.className = 'unlock-alert';
            alert.textContent = '!';
            tab.append(label, alert);
            subtabsContainer.appendChild(tab);
        }

        // Create content section
        let content = document.getElementById(categoryId);
        if (!content) {
            content = document.createElement('div');
            content.id = categoryId;
            content.className = 'building-subtab-content';

            const header = document.createElement('div');
            header.className = 'category-header';
            const title = document.createElement('h3');
            title.textContent = `${categoryLabel} Buildings`;
            const unhideContainer = document.createElement('div');
            unhideContainer.className = 'unhide-obsolete-container';
            unhideContainer.id = `${category}-unhide-container`;
            unhideContainer.style.display = 'none';
            const unhideButton = document.createElement('button');
            unhideButton.id = `${category}-unhide-button`;
            unhideButton.className = 'unhide-obsolete-button';
            unhideButton.textContent = 'Unhide Obsolete Buildings';
            unhideContainer.appendChild(unhideButton);
            header.append(title, unhideContainer);

            const list = document.createElement('div');
            list.className = 'building-list';
            list.id = `${categoryId}-buttons`;
            content.append(header, list);
            contentWrapper.appendChild(content);
        }
    });

    Array.from(subtabsContainer.children).forEach(tab => {
        if (tab.dataset && tab.dataset.subtab && !categorySet.has(tab.dataset.subtab)) {
            tab.remove();
        }
    });
    Array.from(contentWrapper.children).forEach(content => {
        if (content.id && !categorySet.has(content.id)) {
            cleanupTrackedUIListeners(content);
            cleanupDynamicTooltipsIn(content);
            content.remove();
        }
    });
}

function initializeBuildingTabs() {
    createBuildingCategoryTabs();
    if (typeof SubtabManager !== 'function') return;
    buildingSubtabManager = new SubtabManager('.buildings-subtabs .building-subtab', '.building-subtab-content');
    buildingSubtabManager.onActivate(id => {
        if (typeof markBuildingSubtabViewed === 'function') {
            markBuildingSubtabViewed(id);
        }
        updateBuildingDisplay(buildings);
    });
    buildingSubtabManager.activate('resource-buildings');
}

function activateBuildingSubtab(subtabId) {
    if (buildingSubtabManager) {
        buildingSubtabManager.activate(subtabId);
    } else {
        const tab = document.querySelector(`[data-subtab="${subtabId}"]`);
        const content = document.getElementById(subtabId);
        if (tab && content) {
            document.querySelectorAll('.building-subtab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.building-subtab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            content.classList.add('active');
        }
        markBuildingSubtabViewed(subtabId);
    }
    updateBuildingDisplay(buildings);
}

let buildingTabAlertNeeded = false;
let buildingSubtabAlerts = {};

function initializeBuildingSubtabAlerts() {
    const categories = typeof getBuildingCategories === 'function' ? getBuildingCategories() : [];
    buildingSubtabAlerts = {};
    categories.forEach(category => {
        buildingSubtabAlerts[`${category}-buildings`] = false;
    });
}

function registerBuildingUnlockAlert(subtabId) {
    buildingTabAlertNeeded = true;
    buildingSubtabAlerts[subtabId] = true;
    updateBuildingAlert();
    const activeTab = document.getElementById('buildings');
    const activeId = buildingSubtabManager
        ? buildingSubtabManager.activeId
        : (document.querySelector('.building-subtab.active') || {}).dataset?.subtab;
    if (
        activeTab &&
        activeTab.classList.contains('active') &&
        activeId === subtabId
    ) {
        markBuildingSubtabViewed(subtabId);
    }
}

function updateBuildingAlert() {
    let alertEl = buildingAlertElements.main;
    if (!alertEl || !alertEl.isConnected) {
        alertEl = document.getElementById('buildings-alert');
        buildingAlertElements.main = alertEl;
    }
    if (alertEl) {
        const display = (!gameSettings.silenceUnlockAlert && buildingTabAlertNeeded) ? 'inline' : 'none';
        alertEl.style.display = display;
    }
    for (const key in buildingSubtabAlerts) {
        let el = buildingAlertElements[key];
        if (!el || !el.isConnected) {
            el = document.getElementById(`${key}-alert`);
            buildingAlertElements[key] = el;
        }
        if (el) {
            const display = (!gameSettings.silenceUnlockAlert && buildingSubtabAlerts[key]) ? 'inline' : 'none';
            el.style.display = display;
        }
    }
}

function markBuildingsViewed() {
    const active = buildingSubtabManager
        ? buildingSubtabManager.activeId
        : (document.querySelector('.building-subtab.active') || {}).dataset?.subtab;
    if (active && typeof markBuildingSubtabViewed === 'function') {
        markBuildingSubtabViewed(active);
    }
    buildingTabAlertNeeded = false;
    updateBuildingAlert();
}

function markBuildingSubtabViewed(subtabId) {
    buildingSubtabAlerts[subtabId] = false;
    for (const name in buildings) {
        const b = buildings[name];
        if (b.category && `${b.category}-buildings` === subtabId && b.unlocked) {
            b.alertedWhenUnlocked = true;
        }
    }
    if (Object.values(buildingSubtabAlerts).every(v => !v)) {
        buildingTabAlertNeeded = false;
    }
    updateBuildingAlert();
}

function initializeBuildingAlerts() {
    initializeBuildingSubtabAlerts();
    buildingTabAlertNeeded = false;
    for (const k in buildingSubtabAlerts) buildingSubtabAlerts[k] = false;
    for (const name in buildings) {
        const b = buildings[name];
        if (b.unlocked && !b.alertedWhenUnlocked) {
            buildingTabAlertNeeded = true;
            buildingSubtabAlerts[`${b.category}-buildings`] = true;
        }
    }
    updateBuildingAlert();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        registerBuildingUnlockAlert,
        updateBuildingAlert,
        initializeBuildingAlerts,
        markBuildingSubtabViewed,
        markBuildingsViewed,
        initializeBuildingTabs,
        activateBuildingSubtab,
        buildingSubtabManager: () => buildingSubtabManager
    };
} else {
    window.registerBuildingUnlockAlert = registerBuildingUnlockAlert;
    window.updateBuildingAlert = updateBuildingAlert;
    window.initializeBuildingAlerts = initializeBuildingAlerts;
    window.markBuildingSubtabViewed = markBuildingSubtabViewed;
    window.markBuildingsViewed = markBuildingsViewed;
    window.initializeBuildingTabs = initializeBuildingTabs;
    window.activateBuildingSubtab = activateBuildingSubtab;
    window.buildingSubtabManager = () => buildingSubtabManager;
}
