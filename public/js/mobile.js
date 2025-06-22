function setupMobileInterface() {
  const isMobile = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    createMobileElements();
    setupSidebarToggle();
    addOrientationHandling();
    enhanceMobileLogin();
  }
  
  window.addEventListener('resize', handleResize);
}

function createMobileElements() {
  const isMobile = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (!isMobile) return;
  
  if (!document.querySelector('.mobile-users-button')) {
    const chatArea = document.querySelector('.chatArea');
    if (chatArea) {
      const usersButton = document.createElement('button');
      usersButton.className = 'mobile-users-button';
      usersButton.innerHTML = `<svg class="mobile-users-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
      </svg>`;
      chatArea.appendChild(usersButton);
    }
  }
  
  if (!document.querySelector('.sidebar-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }
  
  const sidebarHeader = document.querySelector('.sidebarHeader');
  if (sidebarHeader && !sidebarHeader.querySelector('.close-sidebar')) {
    const closeButton = document.createElement('button');
    closeButton.className = 'close-sidebar';
    closeButton.innerHTML = '×';
    sidebarHeader.appendChild(closeButton);
  }
}

function setupSidebarToggle() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const usersButton = document.querySelector('.mobile-users-button');
  const closeButton = document.querySelector('.close-sidebar');
  
  if (!sidebar || !usersButton) return;
  
  usersButton.addEventListener('click', function() {
    sidebar.classList.add('expanded');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
  
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      sidebar.classList.remove('expanded');
      overlay.classList.remove('active');
    });
  }
  
  if (overlay) {
    overlay.addEventListener('click', function() {
      sidebar.classList.remove('expanded');
      overlay.classList.remove('active');
    });
  }
  
  const userItems = document.querySelectorAll('.userItem');
  userItems.forEach(item => {
    item.addEventListener('click', function() {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('expanded');
        overlay.classList.remove('active');
      }
    });
  });
}

function enhanceMobileLogin() {
  const loginForm = document.querySelector('.loginForm');
  if (!loginForm) return;
  
  loginForm.addEventListener('click', function() {
    setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        activeElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  });
  
  enhanceMobileAvatarSelection();
}

function enhanceMobileAvatarSelection() {
  const showMoreBtn = document.getElementById('show-more-avatars');
  if (!showMoreBtn) return;
  
  showMoreBtn.addEventListener('touchstart', function() {
    this.style.opacity = '0.7';
  });
  
  showMoreBtn.addEventListener('touchend', function() {
    this.style.opacity = '0.9';
    setTimeout(() => this.style.opacity = '', 200);
  });
  
  const avatarOptions = document.querySelectorAll('.avatarOption');
  avatarOptions.forEach(option => {
    option.addEventListener('touchstart', function(e) {
      e.preventDefault();
      this.style.transform = 'scale(1.1)';
      this.style.opacity = '0.9';
    });
    
    option.addEventListener('touchend', function(e) {
      e.preventDefault();
      this.style.transform = '';
      this.style.opacity = '';
      
      this.click();
    });
  });
}

function addOrientationHandling() { 
  const main = document.querySelector('.mainLayout');
  if (!main) return;
  
  window.addEventListener('orientationchange', function() {
    setTimeout(() => {
      main.style.display = 'none';
      void main.offsetHeight;
      main.style.display = 'flex';
    }, 200);
  });
}

function handleResize() {
  const isMobile = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  if (!isMobile) {
    if (sidebar) sidebar.classList.remove('expanded');
    if (overlay) overlay.classList.remove('active');
    
    const mobileButton = document.querySelector('.mobile-users-button');
    if (mobileButton) mobileButton.remove();
    
    if (overlay) overlay.remove();
    
    const closeButton = document.querySelector('.close-sidebar');
    if (closeButton) closeButton.remove();
  } else {
    if (!document.querySelector('.mobile-users-button')) {
      createMobileElements();
      setupSidebarToggle();
    }
  }
}

function setupDynamicUserItems() {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        const newUserItems = document.querySelectorAll('.userItem:not([data-mobile-setup])');
        newUserItems.forEach(item => {
          item.setAttribute('data-mobile-setup', 'true');
          item.addEventListener('click', function() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            if (window.innerWidth <= 768 && sidebar) {
              sidebar.classList.remove('expanded');
              if (overlay) overlay.classList.remove('active');
            }
          });
        });
      }
    });
  });
  
  const usersList = document.querySelector('.usersList');
  if (usersList) {
    observer.observe(usersList, { childList: true });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  setupMobileInterface();
  setupDynamicUserItems();
  
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.attributeName === 'style') {
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer && chatContainer.style.display === 'flex') {
          setTimeout(() => {
            setupMobileInterface();
            setupDynamicUserItems();
          }, 100);
        }
      }
    });
  });
  
  const chatContainer = document.getElementById('chat-container');
  if (chatContainer) {
    observer.observe(chatContainer, { attributes: true });
  }

  const messageInput = document.getElementById('message-input');
  const inputArea = document.querySelector('.inputArea');

  if (!messageInput || !inputArea || !chatContainer) return;

  function isMobile() {
    return window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  const adjustLayoutForKeyboard = (event) => {
    if (!isMobile() || !('visualViewport' in window)) return;

    const viewport = event.target;
    const inputArea = document.querySelector('.inputArea');
    const chatContainer = document.getElementById('chat-container');
    const chatArea = document.querySelector('.chatArea');
    
    if (!inputArea || !chatContainer || !chatArea) return;

    const keyboardHeight = window.innerHeight - viewport.height;
    
    if (keyboardHeight > 150) {
      inputArea.classList.add('mobile-fixed');
      chatArea.classList.add('keyboard-open');
      
      inputArea.style.bottom = `${keyboardHeight}px`;
      
      chatContainer.style.height = `${viewport.height}px`;
      
      chatArea.style.height = `${viewport.height}px`;
      
      const messagesContainer = document.querySelector('.messagesContainer');
      if (messagesContainer) {
        messagesContainer.classList.add('keyboard-open');
        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
      }
      
      setTimeout(() => {
        inputArea.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 200);
    } else {
      inputArea.classList.remove('mobile-fixed');
      chatArea.classList.remove('keyboard-open');
      inputArea.style.bottom = '';
      chatContainer.style.height = '100dvh';
      chatArea.style.height = '100vh';
      
      const messagesContainer = document.querySelector('.messagesContainer');
      if (messagesContainer) {
        messagesContainer.classList.remove('keyboard-open');
      }
    }
  };

  const resetLayout = () => {
    if (!isMobile()) return;
    
    const inputArea = document.querySelector('.inputArea');
    const chatContainer = document.getElementById('chat-container');
    const chatArea = document.querySelector('.chatArea');
    const messagesContainer = document.querySelector('.messagesContainer');
    
    if (inputArea) {
      inputArea.classList.remove('mobile-fixed');
      inputArea.style.bottom = '';
    }
    
    if (chatContainer) {
      chatContainer.style.height = '100dvh';
    }
    
    if (chatArea) {
      chatArea.classList.remove('keyboard-open');
      chatArea.style.height = '100vh';
    }
    
    if (messagesContainer) {
      messagesContainer.classList.remove('keyboard-open');
    }
  };

  if ('visualViewport' in window) {
    window.visualViewport.addEventListener('resize', adjustLayoutForKeyboard);
  }

  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.addEventListener('resize', () => {
      if (document.activeElement === messageInput) {
        setTimeout(() => {
          if ('visualViewport' in window) {
            adjustLayoutForKeyboard({ target: window.visualViewport });
          }
        }, 100);
      }
    });
  }

  messageInput.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.activeElement !== messageInput) {
        resetLayout();
      }
    }, 100);
  });

  messageInput.addEventListener('focus', () => {
    if (isMobile()) {
      setTimeout(() => {
        if ('visualViewport' in window) {
          const viewport = window.visualViewport;
          const keyboardHeight = window.innerHeight - viewport.height;
          if (keyboardHeight > 150) {
            adjustLayoutForKeyboard({ target: viewport });
          }
        }
      }, 300);
    }
  });

  messageInput.addEventListener('input', () => {
    if (isMobile() && document.activeElement === messageInput) {
      setTimeout(() => {
        if ('visualViewport' in window) {
          const viewport = window.visualViewport;
          const keyboardHeight = window.innerHeight - viewport.height;
          if (keyboardHeight > 150) {
            adjustLayoutForKeyboard({ target: viewport });
          }
        }
      }, 100);
    }
  });
}); 
