// Subtab functionality to show/hide building categories
if (typeof SubtabManager === 'undefined') {
    if (typeof require === 'function') {
        SubtabManager = require('./subtab-manager.js');
    } else if (typeof window !== 'undefined') {
        SubtabManager = window.SubtabManager;
    }
}
let buildingSubtabManager = null;

function localizeBuildingTabText(key, vars, fallback) {
    if (typeof t !== 'function') {
        return fallback || key;
    }
    const resolved = t(key, vars);
    if (resolved === key) {
        return fallback || key;
    }
    return resolved;
}

function formatBuildingCategoryLabel(category) {
    const normalized = `${category || ''}`;
    if (!normalized) return '';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getLocalizedBuildingCategoryLabel(category) {
    const fallback = formatBuildingCategoryLabel(category);
    return localizeBuildingTabText(`buildingsTab.subtabs.categories.${category}`, null, fallback);
}

function getLocalizedCategoryHeaderLabel(category) {
    const categoryLabel = getLocalizedBuildingCategoryLabel(category);
    const fallback = `${formatBuildingCategoryLabel(category)} Buildings`;
    return localizeBuildingTabText(
        'buildingsTab.subtabs.categoryHeader',
        { category: categoryLabel },
        fallback
    );
}

function localizeBuildingCategoryTabs() {
    const categories = typeof getBuildingCategories === 'function' ? getBuildingCategories() : [];
    categories.forEach(category => {
        const tabLabel = document.getElementById(`${category}-buildings-label`);
        if (tabLabel) {
            tabLabel.textContent = getLocalizedBuildingCategoryLabel(category);
        }

        const header = document.getElementById(`${category}-buildings-header`);
        if (header) {
            header.textContent = getLocalizedCategoryHeaderLabel(category);
        }

        const unhideButton = document.getElementById(`${category}-unhide-button`);
        if (unhideButton) {
            unhideButton.textContent = localizeBuildingTabText(
                'buildingsTab.subtabs.unhideObsolete',
                null,
                'Unhide Obsolete Buildings'
            );
        }
    });
}

function createBuildingCategoryTabs() {
    const categories = typeof getBuildingCategories === 'function' ? getBuildingCategories() : [];
    if (categories.length === 0) return;

    const subtabsContainer = document.querySelector('.buildings-subtabs');
    const contentWrapper = document.querySelector('.building-subtab-content-wrapper');
    
    if (!subtabsContainer || !contentWrapper) return;

    // Clear existing tabs and content
    subtabsContainer.innerHTML = '';
    contentWrapper.innerHTML = '';

    // Create tabs and content for each category
    categories.forEach(category => {
        const categoryId = `${category}-buildings`;

        const tab = document.createElement('div');
        tab.id = `${categoryId}-tab`;
        tab.className = 'building-subtab';
        tab.dataset.subtab = categoryId;
        const label = document.createElement('span');
        label.id = `${categoryId}-label`;
        label.textContent = getLocalizedBuildingCategoryLabel(category);
        const alert = document.createElement('span');
        alert.id = `${categoryId}-alert`;
        alert.className = 'unlock-alert';
        alert.textContent = '!';
        tab.appendChild(label);
        tab.appendChild(alert);
        subtabsContainer.appendChild(tab);

        const content = document.createElement('div');
        content.id = categoryId;
        content.className = 'building-subtab-content';

        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';

        const header = document.createElement('h3');
        header.id = `${categoryId}-header`;
        header.textContent = getLocalizedCategoryHeaderLabel(category);
        categoryHeader.appendChild(header);

        const unhideContainer = document.createElement('div');
        unhideContainer.className = 'unhide-obsolete-container';
        unhideContainer.id = `${category}-unhide-container`;
        unhideContainer.style.display = 'none';

        const unhideButton = document.createElement('button');
        unhideButton.id = `${category}-unhide-button`;
        unhideButton.className = 'unhide-obsolete-button';
        unhideButton.textContent = localizeBuildingTabText(
            'buildingsTab.subtabs.unhideObsolete',
            null,
            'Unhide Obsolete Buildings'
        );
        unhideContainer.appendChild(unhideButton);
        categoryHeader.appendChild(unhideContainer);

        const list = document.createElement('div');
        list.className = 'building-list';
        list.id = `${categoryId}-buttons`;

        content.appendChild(categoryHeader);
        content.appendChild(list);
        contentWrapper.appendChild(content);
    });
}

function initializeBuildingTabs() {
    createBuildingCategoryTabs();
    localizeBuildingCategoryTabs();
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
    const alertEl = document.getElementById('buildings-alert');
    if (alertEl) {
        const display = (!gameSettings.silenceUnlockAlert && buildingTabAlertNeeded) ? 'inline' : 'none';
        alertEl.style.display = display;
    }
    for (const key in buildingSubtabAlerts) {
        const el = document.getElementById(`${key}-alert`);
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

if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('languageChanged', () => {
        localizeBuildingCategoryTabs();
    });
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
