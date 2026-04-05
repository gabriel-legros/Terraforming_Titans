const atlasUICache = {
    content: null,
    featuredList: null,
    communitySection: null,
    communityHeader: null,
    communityArrow: null,
    communityTitle: null,
    communityContent: null,
    status: null
};

let atlasUIInitialized = false;
let atlasCommunityCollapsed = true;
let atlasLastSignature = '';

function getAtlasText(path, fallback, vars) {
    try {
        return t(`ui.atlas.${path}`, vars, fallback);
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

function cacheAtlasUIElements() {
    atlasUICache.content = atlasUICache.content && atlasUICache.content.isConnected
        ? atlasUICache.content
        : document.getElementById('space-atlas');
    atlasUICache.featuredList = atlasUICache.featuredList && atlasUICache.featuredList.isConnected
        ? atlasUICache.featuredList
        : document.getElementById('atlas-featured-list');
    atlasUICache.communitySection = atlasUICache.communitySection && atlasUICache.communitySection.isConnected
        ? atlasUICache.communitySection
        : document.getElementById('atlas-community-section');
    atlasUICache.communityHeader = atlasUICache.communityHeader && atlasUICache.communityHeader.isConnected
        ? atlasUICache.communityHeader
        : document.getElementById('atlas-community-header');
    atlasUICache.communityArrow = atlasUICache.communityArrow && atlasUICache.communityArrow.isConnected
        ? atlasUICache.communityArrow
        : document.getElementById('atlas-community-arrow');
    atlasUICache.communityTitle = atlasUICache.communityTitle && atlasUICache.communityTitle.isConnected
        ? atlasUICache.communityTitle
        : document.getElementById('atlas-community-title');
    atlasUICache.communityContent = atlasUICache.communityContent && atlasUICache.communityContent.isConnected
        ? atlasUICache.communityContent
        : document.getElementById('atlas-community-content');
    atlasUICache.status = atlasUICache.status && atlasUICache.status.isConnected
        ? atlasUICache.status
        : document.getElementById('atlas-status');
    return atlasUICache;
}

function setAtlasCommunityVisibility() {
    const { communityArrow, communityContent } = cacheAtlasUIElements();
    if (!communityArrow || !communityContent) {
        return;
    }
    communityArrow.textContent = atlasCommunityCollapsed ? '▶' : '▼';
    communityContent.classList.toggle('hidden', atlasCommunityCollapsed);
}

function buildAtlasStat(label, value) {
    const row = document.createElement('p');
    const labelEl = document.createElement('strong');
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.textContent = value;
    row.appendChild(labelEl);
    row.appendChild(valueEl);
    return row;
}

function buildAtlasTag(label, className) {
    const tag = document.createElement('span');
    tag.className = `atlas-world-tag ${className}`;
    tag.textContent = label;
    return tag;
}

function resolveAtlasWorldTypeLabel(result) {
    const archetype = result?.merged?.classification?.archetype || result?.archetype || '';
    return RWG_WORLD_TYPES[archetype]?.displayName || archetype || '—';
}

function resolveAtlasHazardLabel(result) {
    const hazards = Array.isArray(result?.hazards) ? result.hazards : [];
    if (!hazards.length) {
        return getAtlasText('stats.none', 'None');
    }
    return hazards.map((hazard) => {
        const fallback = String(hazard || '')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (char) => char.toUpperCase());
        return getAtlasText(`hazards.${hazard}`, fallback);
    }).join(', ');
}

function buildAtlasEffectsList(definition) {
    const effects = Array.isArray(definition.specialEffects) ? definition.specialEffects : [];
    if (!effects.length) {
        return null;
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'atlas-world-effects';
    const title = document.createElement('div');
    title.className = 'atlas-world-effects-title';
    title.textContent = getAtlasText('effectsTitle', 'Challenge Rules');
    wrapper.appendChild(title);
    effects.forEach((effect) => {
        const item = document.createElement('div');
        item.className = 'atlas-world-effect';
        item.textContent = effect.description || effect.label || effect.id || '';
        wrapper.appendChild(item);
    });
    return wrapper;
}

function buildAtlasWorldCard(definition, category) {
    const result = atlasManager.buildChallengeWorldResult(definition.key) || { merged: { celestialParameters: {} }, hazards: [] };
    const completion = atlasManager.getCompletion(definition.key);
    const currentSeedKey = atlasManager.getCurrentChallengeSeedKey();
    const isCurrent = currentSeedKey === definition.key;
    const isCompleted = completion.completed === true;
    const travelLocked = spaceManager.isRandomTravelLocked();
    const card = document.createElement('div');
    card.className = 'planet-option atlas-world-card';
    if (isCurrent) {
        card.classList.add('current');
    } else if (isCompleted) {
        card.classList.add('terraformed');
    }

    const header = document.createElement('div');
    header.className = 'atlas-world-header';
    const title = document.createElement('h3');
    title.textContent = definition.name || definition.seed || definition.key;
    header.appendChild(title);

    const tags = document.createElement('div');
    tags.className = 'atlas-world-tags';
    if (category === 'community') {
        tags.appendChild(buildAtlasTag(getAtlasText('communityTag', 'Community'), 'atlas-world-tag-community'));
    } else {
        tags.appendChild(buildAtlasTag(getAtlasText('featuredTag', 'Challenge'), 'atlas-world-tag-featured'));
    }
    if (isCompleted) {
        tags.appendChild(buildAtlasTag(getAtlasText('completed', 'Completed'), 'atlas-world-tag-completed'));
    }
    header.appendChild(tags);
    card.appendChild(header);

    const status = document.createElement('div');
    status.className = 'planet-status';
    status.textContent = isCurrent
        ? getAtlasText('current', 'Current')
        : (isCompleted ? getAtlasText('completed', 'Completed') : getAtlasText('available', 'Available'));
    card.appendChild(status);

    const stats = document.createElement('div');
    stats.className = 'planet-stats';
    stats.appendChild(buildAtlasStat(getAtlasText('type', 'Type'), resolveAtlasWorldTypeLabel(result)));
    stats.appendChild(buildAtlasStat(getAtlasText('hazardsLabel', 'Hazards'), resolveAtlasHazardLabel(result)));
    stats.appendChild(buildAtlasStat(getAtlasText('sector', 'Sector'), result?.merged?.celestialParameters?.sector || '—'));
    if (definition.designer) {
        stats.appendChild(buildAtlasStat(getAtlasText('designedBy', 'Designed by'), definition.designer));
    }
    card.appendChild(stats);

    const effects = buildAtlasEffectsList(definition);
    if (effects) {
        card.appendChild(effects);
    }

    const button = document.createElement('button');
    button.className = 'select-planet-button';
    button.textContent = isCurrent
        ? getAtlasText('current', 'Current')
        : getAtlasText('travel', 'Travel');
    button.disabled = travelLocked || isCurrent;
    button.addEventListener('click', () => {
        atlasManager.travelToChallengeWorld(definition.key);
    });
    card.appendChild(button);
    return card;
}

function initializeAtlasUI() {
    const container = document.getElementById('space-atlas');
    if (!container) {
        return;
    }
    container.innerHTML = `
        <div class="space-story-layout atlas-layout">
            <section class="space-card">
                <div class="space-card-header">
                    <h2 class="space-card-title">${getAtlasText('title', 'Challenge Worlds')}</h2>
                    <p class="space-card-subtitle">${getAtlasText('subtitle', 'Travel directly to curated challenge seeds without using the Random World Generator.')}</p>
                </div>
                <div id="atlas-status" class="atlas-status"></div>
                <div id="atlas-featured-list" class="planet-grid"></div>
            </section>
            <section id="atlas-community-section" class="space-card">
                <div id="atlas-community-header" class="summary-header">
                    <span id="atlas-community-arrow" class="summary-arrow">▶</span>
                    <span id="atlas-community-title" class="summary-title">${getAtlasText('communityTitle', 'Community Challenges')}</span>
                </div>
                <div id="atlas-community-content" class="details-content hidden"></div>
            </section>
        </div>
    `;
    cacheAtlasUIElements();
    atlasUICache.communityHeader.addEventListener('click', () => {
        atlasCommunityCollapsed = !atlasCommunityCollapsed;
        setAtlasCommunityVisibility();
    });
    setAtlasCommunityVisibility();
    atlasUIInitialized = true;
}

function ensureAtlasUI() {
    if (!atlasUIInitialized) {
        initializeAtlasUI();
    }
}

function updateAtlasUI(options = {}) {
    if (!atlasManager || !atlasManager.enabled) {
        return;
    }
    ensureAtlasUI();
    const { featuredList, communityContent, communitySection, status } = cacheAtlasUIElements();
    if (!featuredList || !communityContent || !communitySection || !status) {
        return;
    }

    const featured = atlasManager.getFeaturedDefinitions();
    const community = atlasManager.getCommunityDefinitions();
    const signature = JSON.stringify({
        enabled: atlasManager.enabled,
        current: atlasManager.getCurrentChallengeSeedKey(),
        completions: atlasManager.atlasWorldCompletions,
        locked: spaceManager.isRandomTravelLocked(),
        featured: featured.map((definition) => definition.key),
        community: community.map((definition) => definition.key),
        collapsed: atlasCommunityCollapsed
    });
    if (!options.force && signature === atlasLastSignature) {
        return;
    }
    atlasLastSignature = signature;

    status.textContent = spaceManager.isRandomTravelLocked()
        ? getAtlasText('locked', 'You must complete the current world before traveling to Atlas challenges.')
        : getAtlasText('ready', 'Challenge worlds can always be revisited after completion.');
    status.classList.toggle('atlas-status-warning', spaceManager.isRandomTravelLocked());

    featuredList.replaceChildren();
    featured.forEach((definition) => {
        featuredList.appendChild(buildAtlasWorldCard(definition, 'featured'));
    });

    communitySection.style.display = community.length ? '' : 'none';
    if (community.length) {
        communityContent.replaceChildren();
        community.forEach((definition) => {
            communityContent.appendChild(buildAtlasWorldCard(definition, 'community'));
        });
    }
    setAtlasCommunityVisibility();
}

document.addEventListener('click', (event) => {
    const tab = event.target.closest('.space-subtab');
    if (!tab || tab.dataset.subtab !== 'space-atlas') {
        return;
    }
    ensureAtlasUI();
    updateAtlasUI({ force: true });
});

if (typeof showSpaceAtlasTab === 'function') {
    const originalShowSpaceAtlasTab = showSpaceAtlasTab;
    showSpaceAtlasTab = function() {
        originalShowSpaceAtlasTab();
        ensureAtlasUI();
        updateAtlasUI({ force: true });
    };
}

if (typeof updateSpaceUI === 'function') {
    const originalUpdateSpaceUI = updateSpaceUI;
    updateSpaceUI = function(...args) {
        originalUpdateSpaceUI.apply(this, args);
        updateAtlasUI();
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeAtlasUI,
        ensureAtlasUI,
        updateAtlasUI
    };
}
