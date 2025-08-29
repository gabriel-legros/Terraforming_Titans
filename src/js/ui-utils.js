function activateSubtab(subtabClass, contentClass, subtabId, unhide = false) {
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
  }
}

function addTooltipHover(anchor, tooltip) {
  if (!anchor || !tooltip) return;
  anchor.addEventListener('mouseenter', () => {
    // Ensure consistent initial structure
    if (typeof setResourceTooltipColumns === 'function') setResourceTooltipColumns(tooltip, 1);
    tooltip.classList.remove('above', 'three-column');

    // Temporarily show invisibly to measure correctly
    const prevDisplay = tooltip.style.display;
    const prevVisibility = tooltip.style.visibility;
    // Show for measurement; use block initially for single-column
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'hidden';

    // Compute base anchor rect
    const aRect = anchor.getBoundingClientRect();

    const centerHorizontally = () => {
      tooltip.style.left = `${aRect.left + aRect.width / 2}px`;
      tooltip.style.transform = 'translateX(-50%)';
    };

    const clampHorizontally = () => {
      // Clamp to viewport edges with 4px margin
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

    const place = (mode /* 'below'|'above' */) => {
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

    // 1) Try below with single column
    place('below');
    let rect = tooltip.getBoundingClientRect();
    let placed = rect.bottom <= window.innerHeight;

    // 2) Try above with single column
    if (!placed) {
      place('above');
      rect = tooltip.getBoundingClientRect();
      placed = rect.top >= 0;
    }

    // 3) Switch to three columns and retry
    if (!placed) {
      if (typeof setResourceTooltipColumns === 'function') setResourceTooltipColumns(tooltip, 3);
      tooltip.classList.add('three-column');
      // Measure with flex layout to get correct height
      tooltip.style.display = 'flex';

      // 3a) Try below with three columns
      place('below');
      rect = tooltip.getBoundingClientRect();
      placed = rect.bottom <= window.innerHeight;

      // 3b) Fallback above with three columns
      if (!placed) {
        place('above');
      }
    }

    // Reveal; hand control of display back to CSS hover rules
    tooltip.style.visibility = 'visible';
    tooltip.style.display = '';
  });
  anchor.addEventListener('mouseleave', () => {
    tooltip.classList.remove('above', 'three-column');
    if (typeof setResourceTooltipColumns === 'function') setResourceTooltipColumns(tooltip, 1);
    // Clear inline positioning so next hover recalculates cleanly
    tooltip.style.top = '';
    tooltip.style.left = '';
    tooltip.style.transform = '';
    tooltip.style.display = '';
    tooltip.style.visibility = '';
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activateSubtab, addTooltipHover };
}
