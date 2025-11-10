const subtabScrollPositions = {};

function activateSubtab(subtabClass, contentClass, subtabId, unhide = false) {
  const activeContent = document.querySelector(`.${contentClass}.active`);
  if (activeContent) {
    const id = activeContent.getAttribute && activeContent.getAttribute('id');
    const container = activeContent.closest('.tab-content');
    if (typeof id === 'string' && container) {
      subtabScrollPositions[id] = container.scrollTop;
    }
  }

  document.querySelectorAll(`.${subtabClass}`).forEach(t => t.classList.remove('active'));
  document.querySelectorAll(`.${contentClass}`).forEach(c => c.classList.remove('active'));

  const subtab = document.querySelector(`.${subtabClass}[data-subtab="${subtabId}"]`);
  const content = document.getElementById(subtabId);

  if (subtab && content) {
    if (unhide) {
      subtab.classList.remove('hidden');
      content.classList.remove('hidden');
    }
    subtab.classList.add('active');
    content.classList.add('active');
    const container = content.closest('.tab-content');
    if (container) container.scrollTop = subtabScrollPositions[subtabId] || 0;
  }
}

function addTooltipHover(anchor, tooltip) {
  if (!anchor) return;
  const tooltipEl = tooltip || anchor.querySelector && anchor.querySelector('.resource-tooltip');
  if (!tooltipEl) return;

  let pointerActive = false;

  const handleDocumentPointerDown = (event) => {
    if (!pointerActive) return;
    if (anchor.contains(event.target) || tooltipEl.contains(event.target)) return;
    setPointerActive(false);
    hideTooltip();
  };

  const setPointerActive = (active) => {
    pointerActive = active;
    if (active) {
      anchor.classList.add('tooltip-active');
      document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    } else {
      anchor.classList.remove('tooltip-active');
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
    }
  };

  const showTooltip = () => {
    tooltipEl._isActive = true;
    const isResource = !!tooltipEl._columnsInfo || !!tooltipEl.closest('.resource-item');
    tooltipEl.classList.remove('above', 'three-column');

    if (isResource) {
      if (typeof setResourceTooltipColumns === 'function') setResourceTooltipColumns(tooltipEl, 1);

      // Show invisibly to measure
      const prevDisplay = tooltipEl.style.display;
      tooltipEl.style.display = 'block';
      tooltipEl.style.visibility = 'hidden';

      const aRect = anchor.getBoundingClientRect();
      const centerHorizontally = () => {
        tooltipEl.style.left = `${aRect.left + aRect.width / 2}px`;
        tooltipEl.style.transform = 'translateX(-50%)';
      };
      const clampHorizontally = () => {
        const rect = tooltipEl.getBoundingClientRect();
        const margin = 4;
        if (rect.left < margin) {
          tooltipEl.style.left = `${margin}px`;
          tooltipEl.style.transform = 'none';
        } else if (rect.right > window.innerWidth - margin) {
          tooltipEl.style.left = `${Math.max(window.innerWidth - margin - rect.width, margin)}px`;
          tooltipEl.style.transform = 'none';
        }
      };
      const place = (mode) => {
        centerHorizontally();
        if (mode === 'below') {
          tooltipEl.classList.remove('above');
          tooltipEl.style.top = `${aRect.bottom + 4}px`;
        } else {
          const tRect = tooltipEl.getBoundingClientRect();
          tooltipEl.classList.add('above');
          tooltipEl.style.top = `${aRect.top - tRect.height - 4}px`;
        }
        clampHorizontally();
      };
      // below -> above
      place('below');
      let rect = tooltipEl.getBoundingClientRect();
      let placed = rect.bottom <= window.innerHeight;
      if (!placed) {
        place('above');
        rect = tooltipEl.getBoundingClientRect();
        placed = rect.top >= 0;
      }
      // three-column fallback
      if (!placed) {
        if (typeof setResourceTooltipColumns === 'function') setResourceTooltipColumns(tooltipEl, 3);
        tooltipEl.classList.add('three-column');
        tooltipEl.style.display = 'flex';
        place('below');
        rect = tooltipEl.getBoundingClientRect();
        placed = rect.bottom <= window.innerHeight;
        if (!placed) place('above');
      }
      tooltipEl.style.visibility = 'visible';
      tooltipEl.style.display = prevDisplay || '';
    } else {
      // Use CSS positioning; just choose above if no space below
      const prevDisplay = tooltipEl.style.display;
      tooltipEl.style.display = 'block';
      tooltipEl.style.visibility = 'hidden';
      const rect = tooltipEl.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) tooltipEl.classList.add('above');
      else tooltipEl.classList.remove('above');
      tooltipEl.style.visibility = 'visible';
      tooltipEl.style.display = prevDisplay || '';
    }
  };

  const hideTooltip = () => {
    tooltipEl._isActive = false;
    tooltipEl.classList.remove('above', 'three-column');
    if (typeof setResourceTooltipColumns === 'function') setResourceTooltipColumns(tooltipEl, 1);
    tooltipEl.style.top = '';
    tooltipEl.style.left = '';
    tooltipEl.style.transform = '';
    tooltipEl.style.display = '';
    tooltipEl.style.visibility = '';
  };

  anchor.addEventListener('mouseenter', () => {
    showTooltip();
  });
  anchor.addEventListener('mouseleave', () => {
    if (pointerActive) return;
    hideTooltip();
  });
  anchor.addEventListener('focusin', () => {
    showTooltip();
  });
  anchor.addEventListener('focusout', () => {
    if (pointerActive) return;
    hideTooltip();
  });
  anchor.addEventListener('pointerdown', (event) => {
    const type = event.pointerType;
    if (type && type === 'mouse') return;
    if (!pointerActive) {
      setPointerActive(true);
      showTooltip();
    } else {
      setPointerActive(false);
      hideTooltip();
    }
  });
}

function makeCollapsibleCard(card) {
  if (!card) return;
  const header = card.querySelector('.card-header');
  if (!header) return;
  const arrow = document.createElement('span');
  arrow.classList.add('collapse-arrow');
  arrow.innerHTML = '&#9660;';
  header.insertBefore(arrow, header.firstChild);

  const title = header.querySelector('.card-title');
  const toggleTarget = title || header;
  const toggle = () => {
    card.classList.toggle('collapsed');
    arrow.innerHTML = card.classList.contains('collapsed') ? '&#9654;' : '&#9660;';
  };
  arrow.addEventListener('click', toggle);
  if (toggleTarget !== arrow) toggleTarget.addEventListener('click', toggle);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activateSubtab, addTooltipHover, subtabScrollPositions, makeCollapsibleCard };
}
