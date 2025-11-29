const artificialUICache = {
    button: null,
    content: null,
    status: null,
};

function cacheArtificialUIElements() {
    const doc = typeof document !== 'undefined' ? document : null;
    if (!doc) {
        return artificialUICache;
    }

    if (!artificialUICache.button || !artificialUICache.button.isConnected) {
        artificialUICache.button = doc.querySelector('[data-subtab="space-artificial"]');
    }
    if (!artificialUICache.content || !artificialUICache.content.isConnected) {
        artificialUICache.content = doc.getElementById('space-artificial');
    }
    if ((!artificialUICache.status || !artificialUICache.status.isConnected) && artificialUICache.content) {
        artificialUICache.status = artificialUICache.content.querySelector('#artificial-status');
    }

    return artificialUICache;
}

function ensureArtificialLayout() {
    const { content } = cacheArtificialUIElements();
    if (!content || content.dataset.rendered === 'true') {
        return;
    }

    const card = document.createElement('section');
    card.className = 'space-card artificial-card';

    const header = document.createElement('div');
    header.className = 'space-card-header';

    const titleWrapper = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'space-card-title';
    title.textContent = 'Artificial Overseer';
    const subtitle = document.createElement('p');
    subtitle.className = 'space-card-subtitle';
    subtitle.textContent = 'Monitor synthetic systems and their status.';
    titleWrapper.appendChild(title);
    titleWrapper.appendChild(subtitle);
    header.appendChild(titleWrapper);

    const body = document.createElement('div');
    body.className = 'space-card-body';

    const statusRow = document.createElement('div');
    statusRow.className = 'space-stat-card';

    const statusLabel = document.createElement('div');
    statusLabel.className = 'space-stat-label';
    statusLabel.textContent = 'Status';

    const statusValue = document.createElement('div');
    statusValue.id = 'artificial-status';
    statusValue.className = 'space-stat-value';
    statusValue.textContent = 'Artificial systems standby.';

    statusRow.appendChild(statusLabel);
    statusRow.appendChild(statusValue);

    body.appendChild(statusRow);

    card.appendChild(header);
    card.appendChild(body);

    content.appendChild(card);
    content.dataset.rendered = 'true';

    artificialUICache.status = statusValue;
}

function toggleArtificialTabVisibility(isEnabled) {
    const { button, content } = cacheArtificialUIElements();
    if (!button || !content) {
        return;
    }

    const shouldHide = !isEnabled;
    button.classList.toggle('hidden', shouldHide);
    content.classList.toggle('hidden', shouldHide);

    if (shouldHide && button.classList.contains('active')) {
        if (typeof activateSubtab === 'function') {
            activateSubtab('space-subtab', 'space-subtab-content', 'space-story', true);
        } else {
            button.classList.remove('active');
            const storyTab = document.querySelector('[data-subtab="space-story"]');
            const storyContent = document.getElementById('space-story');
            if (storyTab) {
                storyTab.classList.add('active');
            }
            if (storyContent) {
                storyContent.classList.add('active');
            }
        }
    }

    if (!shouldHide) {
        ensureArtificialLayout();
    }
}

function updateArtificialUI(options = {}) {
    const manager = (typeof artificialManager !== 'undefined') ? artificialManager : null;
    const enabled = !!(manager && manager.enabled);
    toggleArtificialTabVisibility(enabled);
    if (!enabled) {
        return;
    }

    ensureArtificialLayout();

    if (artificialUICache.status) {
        const statusText = manager && manager.getStatus ? manager.getStatus() : 'Artificial systems online.';
        artificialUICache.status.textContent = statusText;
    }
}

if (typeof window !== 'undefined') {
    window.updateArtificialUI = updateArtificialUI;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cacheArtificialUIElements,
        ensureArtificialLayout,
        toggleArtificialTabVisibility,
        updateArtificialUI,
    };
}
