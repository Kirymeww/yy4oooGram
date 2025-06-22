function applyTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  
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
  applyTheme('cosmic-magic');
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
}); 