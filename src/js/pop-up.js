function createPopup(title, text, buttonText) {
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
    if(!globalThis.manualPause){ game.scene.resume('mainScene'); }  // Resume the 'mainScene' scene
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
  let index = 0;
  let lastTimestamp = 0;

  const typeLetter = (timestamp) => {
    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }

    let elapsed = timestamp - lastTimestamp;
    let delay = (index > 0 && (text[index - 1] === '.' || text[index - 1] === '\n' || text.slice(index - 4, index) === '<br>')) ? 250 : 50;

    while (elapsed >= delay && index < text.length) {
      if (text[index] === '\n' || text.slice(index, index + 4) === '<br>') {
        popupText.innerHTML += '<br>';
        index += (text[index] === '\n') ? 1 : 4;
      } else {
        popupText.innerHTML += text[index];
        index++;
      }
      elapsed -= delay;
      delay = (index > 0 && (text[index - 1] === '.' || text[index - 1] === '\n' || text.slice(index - 4, index) === '<br>')) ? 250 : 50;
    }
    lastTimestamp = timestamp - elapsed;

    if (index < text.length) {
      requestAnimationFrame(typeLetter);
    } else {
      closeButton.style.display = 'block';
    }
  };

  requestAnimationFrame(typeLetter);
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
    if(!globalThis.manualPause){ game.scene.resume('mainScene'); }
  });

  popupWindow.appendChild(closeButton);
  overlay.appendChild(popupWindow);
  document.body.appendChild(overlay);
}
