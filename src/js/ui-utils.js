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
    const bottom = tooltip.getBoundingClientRect().bottom;
    if (bottom > window.innerHeight) {
      tooltip.classList.add('above');
    } else {
      tooltip.classList.remove('above');
    }
  });
  anchor.addEventListener('mouseleave', () => {
    tooltip.classList.remove('above');
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activateSubtab, addTooltipHover };
}
