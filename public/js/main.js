function initApp() {
  document.documentElement.setAttribute('data-theme', 'dark');
}

document.addEventListener('DOMContentLoaded', initApp);

document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.getElementById('modal-overlay');
  const confirmModal = document.getElementById('confirm-action-modal');
  
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
  
  overlay.addEventListener('click', function() {
    hideModalWithOverlay(confirmModal);
  });
}); 