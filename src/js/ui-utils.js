const subtabScrollPositions = {};

function activateSubtab(subtabClass, contentClass, subtabId, unhide = false) {
  const activeContent = document.querySelector(`.${contentClass}.active`);
  if (activeContent) {
    const id = activeContent.getAttribute && activeContent.getAttribute('id');
    if (typeof id === 'string') subtabScrollPositions[id] = activeContent.scrollTop;
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
    content.scrollTop = subtabScrollPositions[subtabId] || 0;
  }
}

function addTooltipHover(anchor, tooltip) {
  if (!anchor || !tooltip) return;
  anchor.addEventListener('mouseenter', () => {
    tooltip._isActive = true;
    const isResource = !!tooltip._columnsInfo || !!tooltip.closest('.resource-item');
    const isInfo = !!tooltip.closest('.info-tooltip-icon');
    tooltip.classList.remove('above', 'three-column');

    if (isResource) {
      if (typeof setResourceTooltipColumns === 'function') setResourceTooltipColumns(tooltip, 1);

      // Show invisibly to measure
      const prevDisplay = tooltip.style.display;
      const prevVisibility = tooltip.style.visibility;
      tooltip.style.display = 'block';
      tooltip.style.visibility = 'hidden';

      const aRect = anchor.getBoundingClientRect();
      const centerHorizontally = () => {
        tooltip.style.left = `${aRect.left + aRect.width / 2}px`;
        tooltip.style.transform = 'translateX(-50%)';
      };
      const clampHorizontally = () => {
        const rect = tooltip.getBoundingClientRect();
        const margin = 4;
        if (rect.left < margin) {
          tooltip.style.left = `${margin}px`;
          tooltip.style.transform = 'none';
        } else if (rect.right > window.innerWidth - margin) {
          tooltip.style.left = `${Math.max(window.innerWidth - margin - rect.width, margin)}px`;
          tooltip.style.transform = 'none';
        }
      };
      const place = (mode) => {
        centerHorizontally();
        if (mode === 'below') {
          tooltip.classList.remove('above');
          tooltip.style.top = `${aRect.bottom + 4}px`;
        } else {
          const tRect = tooltip.getBoundingClientRect();
          tooltip.classList.add('above');
          tooltip.style.top = `${aRect.top - tRect.height - 4}px`;
        }
        clampHorizontally();
      };
      // below -> above
      place('below');
      let rect = tooltip.getBoundingClientRect();
      let placed = rect.bottom <= window.innerHeight;
      if (!placed) {
        place('above');
        rect = tooltip.getBoundingClientRect();
        placed = rect.top >= 0;
      }
      // three-column fallback
      if (!placed) {
        if (typeof setResourceTooltipColumns === 'function') setResourceTooltipColumns(tooltip, 3);
        tooltip.classList.add('three-column');
        tooltip.style.display = 'flex';
        place('below');
        rect = tooltip.getBoundingClientRect();
        placed = rect.bottom <= window.innerHeight;
        if (!placed) place('above');
      }
      tooltip.style.visibility = 'visible';
      tooltip.style.display = prevDisplay || '';
    } else {
      // Use CSS positioning; just choose above if no space below
      const prevDisplay = tooltip.style.display;
      const prevVisibility = tooltip.style.visibility;
      tooltip.style.display = 'block';
      tooltip.style.visibility = 'hidden';
      const rect = tooltip.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) tooltip.classList.add('above');
      else tooltip.classList.remove('above');
      tooltip.style.visibility = 'visible';
      tooltip.style.display = prevDisplay || '';
    }
  });
  anchor.addEventListener('mouseleave', () => {
    tooltip._isActive = false;
    tooltip.classList.remove('above', 'three-column');
    if (typeof setResourceTooltipColumns === 'function') setResourceTooltipColumns(tooltip, 1);
    tooltip.style.top = '';
    tooltip.style.left = '';
    tooltip.style.transform = '';
    tooltip.style.display = '';
    tooltip.style.visibility = '';
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activateSubtab, addTooltipHover, subtabScrollPositions };
}
