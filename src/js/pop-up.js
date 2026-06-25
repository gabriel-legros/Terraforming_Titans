let popupTypingSkip = null;

function skipActivePopupTyping() {
  if (!popupTypingSkip) {
    return false;
  }
  popupTypingSkip();
  return true;
}

function createPopup(title, text, buttonText, options = {}) {
  window.popupActive = true; // Flag that a popup is active
  game.scene.pause('mainScene');
  // Create the overlay div
  const overlay = document.createElement('div');
  overlay.classList.add('popup-overlay');

  // Create the pop-up window
  const popupWindow = document.createElement('div');
  popupWindow.classList.add('popup-window');

  // Create the title element
  const popupTitle = document.createElement('h2');
  popupTitle.classList.add('popup-title');
  popupTitle.textContent = title;

  // Create the text container (for left-justified text)
  const textContainer = document.createElement('div');
  textContainer.classList.add('popup-text-container');

  // Create the text element
  const popupText = document.createElement('p');
  popupText.classList.add('popup-text');

  // Create the close button
  const closeButton = document.createElement('button');
  closeButton.classList.add('popup-close-button');
  closeButton.textContent = buttonText;
  closeButton.style.display = 'none'; // Hide the button initially

  // Close button event listener
  closeButton.addEventListener('click', () => {
    document.body.removeChild(overlay); // Remove the pop-up
    window.popupActive = false; // Clear popup flag
    game.scene.resume('mainScene');
    if (options.onClose instanceof Function) {
      options.onClose();
    }
  });

  // Append the text and button to the text container
  textContainer.appendChild(popupText);
  textContainer.appendChild(closeButton);

  // Append title and text container to the pop-up window
  popupWindow.appendChild(popupTitle);
  popupWindow.appendChild(textContainer);

  // Append the pop-up window to the overlay
  overlay.appendChild(popupWindow);

  // Append the overlay to the body
  document.body.appendChild(overlay);

  // Typing animation for the text
  const segments = buildJournalSegments(text);
  let segmentIndex = 0;
  let textIndex = 0;
  let lastTimestamp = 0;
  let popupTypingFrameId = 0;
  let popupTypingComplete = false;

  const appendNextPopupCharacter = () => {
    const segment = segments[segmentIndex];
    if (segment.isBreak) {
      popupText.appendChild(document.createElement('br'));
      segmentIndex++;
      textIndex = 0;
      return '\n';
    }

    if (!segment._node) {
      segment._node = segment.className ? document.createElement('span') : document.createTextNode('');
      if (segment.className) {
        segment._node.className = segment.className;
      }
      popupText.appendChild(segment._node);
    }

    const character = segment.text[textIndex];
    segment._node.textContent += character;
    textIndex++;
    if (textIndex >= segment.text.length) {
      segmentIndex++;
      textIndex = 0;
    }
    return character;
  };

  const finishPopupTyping = () => {
    if (popupTypingComplete) {
      return;
    }
    popupTypingComplete = true;
    cancelAnimationFrame(popupTypingFrameId);
    while (segmentIndex < segments.length) {
      appendNextPopupCharacter();
    }
    closeButton.style.display = 'block';
    popupTypingSkip = null;
  };

  const typeLetter = (timestamp) => {
    if (popupTypingComplete) {
      return;
    }
    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }

    let elapsed = timestamp - lastTimestamp;
    let previousCharacter = '';
    let delay = 50 * (options.textSpeedMultiplier || 1);

    while (elapsed >= delay && segmentIndex < segments.length) {
      previousCharacter = appendNextPopupCharacter();
      elapsed -= delay;
      delay = ((previousCharacter === '.' || previousCharacter === '\n') ? 250 : 50) * (options.textSpeedMultiplier || 1);
    }
    lastTimestamp = timestamp - elapsed;

    if (segmentIndex < segments.length) {
      popupTypingFrameId = requestAnimationFrame(typeLetter);
    } else {
      finishPopupTyping();
    }
  };

  popupTypingSkip = finishPopupTyping;
  popupTypingFrameId = requestAnimationFrame(typeLetter);
}

function createSystemPopup(title, text, buttonText) {
  window.popupActive = true;
  game.scene.pause('mainScene');

  const overlay = document.createElement('div');
  overlay.classList.add('system-popup-overlay');

  const popupWindow = document.createElement('div');
  popupWindow.classList.add('system-popup-window');

  if (title) {
    const popupTitle = document.createElement('h2');
    popupTitle.classList.add('system-popup-title');
    popupTitle.textContent = title;
    popupWindow.appendChild(popupTitle);
  }

  const popupText = document.createElement('p');
  popupText.classList.add('system-popup-text');
  popupText.textContent = text;
  popupWindow.appendChild(popupText);

  const closeButton = document.createElement('button');
  closeButton.classList.add('popup-close-button');
  closeButton.textContent = buttonText || 'OK';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(overlay);
    window.popupActive = false;
    game.scene.resume('mainScene');
  });

  popupWindow.appendChild(closeButton);
  overlay.appendChild(popupWindow);
  document.body.appendChild(overlay);
}

function createSystemChoicePopup(title, text, yesText, noText, onYes, onNo, options = {}) {
  window.popupActive = true;
  game.scene.pause('mainScene');

  const overlay = document.createElement('div');
  overlay.classList.add('system-popup-overlay', 'system-choice-popup-overlay');

  const popupWindow = document.createElement('div');
  popupWindow.classList.add('system-popup-window', 'system-choice-popup-window');

  if (title) {
    const popupTitle = document.createElement('h2');
    popupTitle.classList.add('system-popup-title');
    popupTitle.textContent = title;
    popupWindow.appendChild(popupTitle);
  }

  const popupText = document.createElement('p');
  popupText.classList.add('system-popup-text', 'system-choice-popup-text');
  popupText.textContent = text;
  popupWindow.appendChild(popupText);

  const buttonRow = document.createElement('div');
  buttonRow.classList.add('system-choice-popup-buttons');

  const checkboxLabelText = options.checkboxLabel || '';
  const disableYesWhenChecked = options.disableYesWhenChecked === true;
  let checkboxInput = null;
  if (checkboxLabelText) {
    const checkboxRow = document.createElement('label');
    checkboxRow.classList.add('system-choice-popup-checkbox-row');
    checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';
    checkboxInput.checked = options.checkboxChecked === true;
    const checkboxText = document.createElement('span');
    checkboxText.textContent = checkboxLabelText;
    checkboxRow.append(checkboxInput, checkboxText);
    popupWindow.appendChild(checkboxRow);
  }

  const yesButton = document.createElement('button');
  yesButton.classList.add('system-choice-popup-button', 'system-choice-popup-button-yes');
  yesButton.textContent = yesText || 'Yes';

  const noButton = document.createElement('button');
  noButton.classList.add('system-choice-popup-button', 'system-choice-popup-button-no');
  noButton.textContent = noText || 'No';

  const closeChoicePopup = (action) => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    window.popupActive = false;
    game.scene.resume('mainScene');
    if (action) {
      action();
    }
  };

  const updateYesButtonEnabled = () => {
    if (!disableYesWhenChecked || !checkboxInput) {
      yesButton.disabled = false;
      return;
    }
    yesButton.disabled = checkboxInput.checked;
  };

  if (checkboxInput) {
    checkboxInput.addEventListener('change', () => {
      updateYesButtonEnabled();
      if (typeof options.onCheckboxChange === 'function') {
        options.onCheckboxChange(checkboxInput.checked);
      }
    });
  }

  updateYesButtonEnabled();

  yesButton.addEventListener('click', () => closeChoicePopup(onYes));
  noButton.addEventListener('click', () => closeChoicePopup(onNo));

  buttonRow.append(yesButton, noButton);
  popupWindow.appendChild(buttonRow);
  if (checkboxInput) {
    popupWindow.appendChild(checkboxInput.parentNode);
  }
  overlay.appendChild(popupWindow);
  document.body.appendChild(overlay);
}
