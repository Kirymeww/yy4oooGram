function applyTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('savedTheme', themeName);
  const customSelectTrigger = document.getElementById('custom-select-trigger');
  if (customSelectTrigger) {
    const selectedOption = document.querySelector(`.custom-option[data-value="${themeName}"]`);
    if (selectedOption) {
      customSelectTrigger.querySelector('span').textContent = selectedOption.textContent;
      
      document.querySelectorAll('.custom-option.selected').forEach(el => el.classList.remove('selected'));
      selectedOption.classList.add('selected');
    }
  }
}

function initApp() {
  const savedTheme = localStorage.getItem('savedTheme');
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    applyTheme('cosmic-magic');
  }
}

document.addEventListener('DOMContentLoaded', initApp);

document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.getElementById('modal-overlay');
  const confirmModal = document.getElementById('confirm-action-modal');
  const settingsModal = document.getElementById('settings-modal');
  const settingsButton = document.getElementById('settings-button');
  const settingsCloseButton = document.getElementById('settings-close-button');
  
  const customSelect = document.getElementById('custom-select');

  window.showModalWithOverlay = function(modal) {
    overlay.style.display = 'block';
    modal.style.display = 'block';
  };
  
  window.hideModalWithOverlay = function(modal) {
    overlay.style.display = 'none';
    modal.style.display = 'none';
  };
  
  document.getElementById('confirm-action').addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  document.getElementById('cancel-action').addEventListener('click', function(e) {
    e.stopPropagation();
    hideModalWithOverlay(confirmModal);
  });
  
  confirmModal.addEventListener('click', function(e) {
    e.stopPropagation();
  });

  if (settingsButton) {
    settingsButton.addEventListener('click', (e) => {
      e.preventDefault();
      showModalWithOverlay(settingsModal);
    });
  }

  if (settingsCloseButton) {
    settingsCloseButton.addEventListener('click', () => {
      hideModalWithOverlay(settingsModal);
    });
  }
  
  if (settingsModal) {
    settingsModal.addEventListener('click', e => e.stopPropagation());
  }

  if (customSelect) {
    const trigger = document.getElementById('custom-select-trigger');
    const options = document.getElementById('custom-options');
    const optionElements = options.querySelectorAll('.custom-option');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      customSelect.classList.toggle('open');
    });

    optionElements.forEach(option => {
      option.addEventListener('click', () => {
        const selectedValue = option.getAttribute('data-value');
        applyTheme(selectedValue);
        customSelect.classList.remove('open');
      });
    });
  }
  
  overlay.addEventListener('click', function() {
    hideModalWithOverlay(confirmModal);
    if (settingsModal) {
      hideModalWithOverlay(settingsModal);
    }
  });

  document.body.addEventListener('click', () => {
    if (customSelect && customSelect.classList.contains('open')) {
      customSelect.classList.remove('open');
    }
  });

  const appIcon = document.querySelector('.appIcon');
  if (appIcon) {
    appIcon.addEventListener('mouseenter', () => {
      appIcon.classList.add('fading');
      setTimeout(() => {
        appIcon.style.webkitMaskImage = "url('public/Images/amogus.png')";
        appIcon.style.maskImage = "url('public/Images/amogus.png')";
        appIcon.style.webkitMaskPosition = '4px 0';
        appIcon.style.maskPosition = '4px 0';
        appIcon.classList.remove('fading');
      }, 200);
    });
    appIcon.addEventListener('mouseleave', () => {
      appIcon.classList.add('fading');
      setTimeout(() => {
        appIcon.style.webkitMaskImage = "url('public/Images/frame.png')";
        appIcon.style.maskImage = "url('public/Images/frame.png')";
        appIcon.style.webkitMaskPosition = 'center';
        appIcon.style.maskPosition = 'center';
        appIcon.classList.remove('fading');
      }, 200);
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const savedUsername = localStorage.getItem('savedUsername');
  if (savedUsername) {
    const usernameInput = document.getElementById('username-input');
    if (usernameInput) usernameInput.value = savedUsername;
  }
  const savedTheme = localStorage.getItem('savedTheme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) themeSelector.value = savedTheme;
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function() {
      const usernameInput = document.getElementById('username-input');
      if (usernameInput && usernameInput.value) {
        localStorage.setItem('savedUsername', usernameInput.value.trim());
      }
    });
  }

  const customSelect = document.getElementById('custom-select');
  if (customSelect) {
    const options = document.getElementById('custom-options');
    if (options) {
      options.querySelectorAll('.custom-option').forEach(option => {
        option.addEventListener('click', () => {
          const selectedValue = option.getAttribute('data-value');
          if (selectedValue) {
            localStorage.setItem('savedTheme', selectedValue);
          }
        });
      });
    }
  }
});

function saveUsernameAndTheme(username, theme) {
  localStorage.setItem('savedUsername', username);
  localStorage.setItem('savedTheme', theme);
} 