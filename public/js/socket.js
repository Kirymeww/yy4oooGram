let socket = null;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;

const currentUser = {
  id: '',
  username: '',
  avatar: ''
};

let typing = false;
let typingTimeout;

let typingUsers = new Set();

let activeMessageMenu = null;
let editingMessageId = null;

function createMessageElement(message, isMyMessage, isNewMessage = true) {
  const messageWrapper = document.createElement('div');
  
  if (isNewMessage) {
    messageWrapper.className = `messageWrapper ${isMyMessage ? 'myMessage' : ''}`;
  } else {
    messageWrapper.className = `messageWrapper ${isMyMessage ? 'myMessage' : ''} no-animation`;
  }
  
  messageWrapper.dataset.messageId = message.id;
  messageWrapper.dataset.userId = message.user.id;
  messageWrapper.dataset.username = message.user.username;
  
  const messageContent = document.createElement('div');
  messageContent.className = 'messageContent';
  
  const messageSender = document.createElement('div');
  messageSender.className = 'messageSender';
  messageSender.textContent = isMyMessage ? '' : message.user.username;
  messageContent.appendChild(messageSender);
  
  const messageText = document.createElement('div');
  messageText.className = 'messageText';
  messageText.textContent = message.text;
  messageContent.appendChild(messageText);
  
  const messageTime = document.createElement('div');
  messageTime.className = 'messageTime';
  messageTime.textContent = formatTime(message.time);
  if (message.edited) {
    messageTime.textContent += ' (изменено)';
  }
  messageContent.appendChild(messageTime);
  
  messageWrapper.appendChild(messageContent);
  
  if (!isMyMessage) {
    const avatar = document.createElement('img');
    avatar.src = message.user.avatar;
    avatar.className = 'userAvatar';
    avatar.alt = message.user.username;
    messageWrapper.prepend(avatar);
  }
  
  if (isMyMessage) {
    messageContent.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (editingMessageId === message.id) {
        return;
      }
      
      const rect = this.getBoundingClientRect();
      const menuX = window.innerWidth <= 768 ? rect.left + rect.width / 2 : rect.right - 10;
      const menuY = rect.top + 10;
      
      showMessageMenu(message.id, menuX, menuY);
    });
  }
  
  return messageWrapper;
}

function showMessageMenu(messageId, x, y) {
  closeMessageMenu();
  
  const menu = document.createElement('div');
  menu.className = 'message-context-menu';
  menu.innerHTML = `
    <div class="menu-item edit-message">Редактировать</div>
    <div class="menu-item delete-message">Удалить</div>
  `;
  
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    menu.classList.add('mobile');
    menu.style.left = '50%';
    menu.style.top = `${y}px`;
    menu.style.transform = 'translateX(-50%)';
  } else {
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    setTimeout(() => {
      const menuRect = menu.getBoundingClientRect();
      if (menuRect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - menuRect.width - 10}px`;
      }
      if (menuRect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - menuRect.height - 10}px`;
      }
    }, 0);
  }
  
  document.body.appendChild(menu);
  activeMessageMenu = { menu, messageId };
  
  menu.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  menu.querySelector('.edit-message').addEventListener('click', function(e) {
    e.stopPropagation();
    startEditingMessage(messageId);
    closeMessageMenu();
  });
  
  menu.querySelector('.delete-message').addEventListener('click', function(e) {
    e.stopPropagation();
    confirmDeleteMessage(messageId);
    closeMessageMenu();
  });
  
  const escHandler = function(e) {
    if (e.key === 'Escape') {
      closeMessageMenu();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
  setTimeout(() => {
    document.addEventListener('click', closeMessageMenu);
  }, 10);
}

function closeMessageMenu() {
  if (activeMessageMenu && activeMessageMenu.menu) {
    if (document.body.contains(activeMessageMenu.menu)) {
      activeMessageMenu.menu.remove();
    }
    document.removeEventListener('click', closeMessageMenu);
    document.removeEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeMessageMenu();
    });
    activeMessageMenu = null;
  }
}

function startEditingMessage(messageId) {
  const messageWrapper = document.querySelector(`.messageWrapper[data-message-id="${messageId}"]`);
  if (!messageWrapper) return;
  
  const messageTextElement = messageWrapper.querySelector('.messageText');
  if (!messageTextElement) return;
  
  const originalText = messageTextElement.textContent;
  
  messageWrapper.classList.add('editing');
  
  const sendButton = document.getElementById('send-button');
  sendButton.classList.add('editing');
  
  const messageInput = document.getElementById('message-input');
  const currentInputText = messageInput.value;
  
  const previousState = {
    text: currentInputText,
    placeholder: messageInput.placeholder
  };
  
  messageInput.value = originalText;
  messageInput.placeholder = 'Редактирование сообщения...';
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  
  editingMessageId = messageId;
  
  // Обработчик клавиш Escape для отмены и Enter для сохранения
  const keyHandler = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newText = messageInput.value.trim();
      if (newText) {
        if (socket) {
          socket.emit('editMessage', {
            id: messageId,
            text: newText
          });
        }
        
        messageInput.value = '';
        messageInput.placeholder = previousState.placeholder;
        
        messageWrapper.classList.remove('editing');
        
        document.getElementById('send-button').classList.remove('editing');
        
        editingMessageId = null;
        
        closeMessageMenu();
        messageInput.removeEventListener('keydown', keyHandler);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      messageInput.value = previousState.text;
      messageInput.placeholder = previousState.placeholder;
      
      messageWrapper.classList.remove('editing');
      
      document.getElementById('send-button').classList.remove('editing');
      
      editingMessageId = null;
      
      closeMessageMenu();
      messageInput.removeEventListener('keydown', keyHandler);
    }
  };
  
  messageInput.addEventListener('keydown', keyHandler);
}

function confirmDeleteMessage(messageId) {
  showConfirmModal(
    "Удалить сообщение",
    "Вы уверены, что хотите удалить это сообщение?",
    true,
    () => {
      if (socket) {
        socket.emit('deleteMessage', { id: messageId });
      }
    }
  );
}

function updateMessageText(messageId, newText, isEdited) {
  const messageWrapper = document.querySelector(`.messageWrapper[data-message-id="${messageId}"]`);
  if (!messageWrapper) return;
  
  const messageTextElement = messageWrapper.querySelector('.messageText');
  const messageTimeElement = messageWrapper.querySelector('.messageTime');
  
  if (messageTextElement) {
    messageTextElement.textContent = newText;
  }
  
  if (messageTimeElement && isEdited) {
    if (!messageTimeElement.textContent.includes('(изменено)')) {
      messageTimeElement.textContent += ' (изменено)';
    }
  }
}

function removeMessage(messageId) {
  const messageWrapper = document.querySelector(`.messageWrapper[data-message-id="${messageId}"]`);
  if (messageWrapper) {
    messageWrapper.classList.add('removing');
    setTimeout(() => {
      messageWrapper.remove();
    }, 300);
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addUserToList(user, isNewUser = true) {
  const usersList = document.querySelector('.usersList');
  
  const existingUser = document.getElementById(`user-${user.id}`);
  
  if (existingUser) {
    const avatarElement = existingUser.querySelector('.userAvatar');
    if (avatarElement) {
      avatarElement.src = user.avatar;
    }
    return;
  }
  
  const userItem = document.createElement('div');
  
  if (isNewUser) {
    userItem.className = 'userItem';
  } else {
    userItem.className = 'userItem no-animation';
  }
  
  userItem.id = `user-${user.id}`;
  
  if (user.id === currentUser.id) {
    userItem.classList.add('current-user');
  }
  
  const avatar = document.createElement('img');
  avatar.src = user.avatar;
  avatar.className = 'userAvatar online';
  avatar.alt = user.username;
  
  const userName = document.createElement('div');
  userName.className = 'userName';
  userName.textContent = user.username;
  
  userItem.appendChild(avatar);
  userItem.appendChild(userName);
  
  if (user.id === currentUser.id) {
    const existingSeparator = document.querySelector('.users-separator');
    if (!existingSeparator) {
      const separator = document.createElement('div');
      separator.className = 'users-separator';
      
      if (usersList.firstChild) {
        usersList.insertBefore(separator, usersList.firstChild);
        usersList.insertBefore(userItem, usersList.firstChild);
      } else {
        usersList.appendChild(userItem);
        usersList.appendChild(separator);
      }
    } else {
      usersList.insertBefore(userItem, usersList.firstChild);
    }
  } else {
    const separator = document.querySelector('.users-separator');
    if (separator) {
      separator.parentNode.insertBefore(userItem, separator.nextSibling);
    } else {
      usersList.appendChild(userItem);
    }
  }
}

function removeUser(userId) {
  const userElement = document.getElementById(`user-${userId}`);
  if (userElement) {
    userElement.remove();
  }
}

function createNotificationToast(message) {
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .notification-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 300px;
        background-color: var(--card-background);
        border-left: 3px solid var(--accent-color);
        padding: 12px 15px;
        border-radius: 6px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        z-index: 1000;
        color: var(--text-color);
        opacity: 0.9;
        transition: opacity 0.3s ease;
      }
      
      .notification-toast.mobile {
        right: auto;
        left: 50%;
        transform: translateX(-50%);
      }
    `;
    document.head.appendChild(style);
  }
  
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.zIndex = '1000';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    document.body.appendChild(toastContainer);
  }
  
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.textContent = message;
  
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    toast.classList.add('mobile');
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
  } else {
    const existingToasts = document.querySelectorAll('.notification-toast:not(.mobile)').length;
    toast.style.position = 'fixed';
    toast.style.top = `${20 + existingToasts * 70}px`;
    toast.style.right = '20px';
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
  
  return toast;
}

function sendMessage() {
  if (!socket) return;
  
  const messageInput = document.getElementById('message-input');
  const message = messageInput.value.trim();
  
  if (message) {
    if (editingMessageId) {
      const saveBtn = document.querySelector('.edit-save-btn');
      if (saveBtn) {
        saveBtn.click();
        return;
      }
    }
    
    socket.emit('chatMessage', { text: message });
    messageInput.value = '';
    messageInput.focus();
    
    socket.emit('stopTyping');
    typing = false;
    clearTimeout(typingTimeout);
  }
}

function handleTyping() {
  if (!socket) return;
  
  if (!typing) {
    typing = true;
    socket.emit('typing');
  }
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stopTyping');
    typing = false;
  }, 2000);
}

function initChat(userData) {
  try {
    if (!userData || !userData.user) {
      console.error('Invalid userData received:', userData);
      showConfirmModal("Ошибка входа", "Получены некорректные данные от сервера", false);
      return;
    }
    
    // Проверяем, не инициализирован ли уже чат
    if (document.getElementById('login-form').style.display === 'none') {
      console.log('Чат уже инициализирован, обновляем данные');
      
      currentUser.id = userData.user.id;
      currentUser.username = userData.user.username;
      currentUser.avatar = userData.user.avatar;
      
      document.getElementById('current-user-avatar').src = userData.user.avatar;
      document.getElementById('current-user-name').textContent = userData.user.username;
      
      // Обновляем список пользователей
      if (Array.isArray(userData.users)) {
        document.querySelector('.usersList').innerHTML = '';
        userData.users.forEach(user => {
          addUserToList(user, false);
        });
      }
      
      return;
    }
    
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';

    currentUser.id = userData.user.id;
    currentUser.username = userData.user.username;
    currentUser.avatar = userData.user.avatar;
    
    document.getElementById('current-user-avatar').src = userData.user.avatar;
    document.getElementById('current-user-name').textContent = userData.user.username;
    
    document.querySelector('.usersList').innerHTML = '';
    
    if (Array.isArray(userData.users)) {
      userData.users.forEach(user => {
        addUserToList(user, false);
      });
    } else {
      console.warn('Users list is not an array:', userData.users);
    }
    
    const messagesContainer = document.querySelector('.messagesContainer');
    messagesContainer.innerHTML = '';
    
    if (Array.isArray(userData.messages)) {
      userData.messages.forEach(message => {
        const isMyMessage = message.user.id === currentUser.id || message.user.username.toLowerCase() === currentUser.username.toLowerCase();
        const messageElement = createMessageElement(message, isMyMessage, false);
        messagesContainer.appendChild(messageElement);
      });
    } else {
      console.warn('Messages list is not an array:', userData.messages);
    }
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    document.getElementById('message-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    document.getElementById('message-input').addEventListener('input', () => {
      handleTyping();
    });
    
    document.getElementById('send-button').addEventListener('click', sendMessage);
    
    console.log('Chat initialized successfully');
  } catch (error) {
    console.error('Error initializing chat:', error);
    showConfirmModal("Ошибка инициализации", "Произошла ошибка при инициализации чата", false);
  }
}

function setupChatEvents() {
  if (!socket) return;
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    showConfirmModal("Ошибка соединения", "Произошла ошибка при работе с сервером", false);
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error in chat:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
    if (reason === 'io server disconnect') {
      showConfirmModal("Соединение разорвано", "Сервер разорвал соединение. Возможно, вы были отключены администратором.", false);
    } else if (reason === 'transport close') {
      showConfirmModal("Соединение потеряно", "Потеряно соединение с сервером. Проверьте интернет-соединение.", false);
    }
  });
  
  socket.on('welcome', (userData) => {
    console.log('Received welcome event with data:', userData);
    
    if (!userData || !userData.user || !userData.user.id) {
      console.error('Invalid welcome data received:', userData);
      showConfirmModal(
        "Ошибка входа", 
        "Получены некорректные данные от сервера при входе. Попробуйте перезагрузить страницу.", 
        false
      );
      return;
    }
    
    // Не вызываем initChat здесь, так как он уже вызывается в joinChat
  });
  
  socket.on('message', (message) => {
    const messagesContainer = document.querySelector('.messagesContainer');
    const isMyMsg = message.user.id === currentUser.id || message.user.username.toLowerCase() === currentUser.username.toLowerCase();
    const messageElement = createMessageElement(message, isMyMsg);
    messagesContainer.appendChild(messageElement);
    
    updateTypingIndicator();
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
  
  socket.on('messageEdited', (message) => {
    updateMessageText(message.id, message.text, true);
  });
  
  socket.on('messageDeleted', (data) => {
    removeMessage(data.id);
  });
  
  socket.on('avatarChanged', (data) => {
    console.log('Получено событие avatarChanged:', data);
    
    const userElement = document.querySelector(`.userItem[id="user-${data.userId}"]`);
    if (userElement) {
      const avatarElement = userElement.querySelector('.userAvatar');
      if (avatarElement) {
        avatarElement.src = data.newAvatar;
      }
    }
    
    const messageAvatars = document.querySelectorAll(`.messageWrapper .userAvatar[alt="${data.username}"]`);
    messageAvatars.forEach(avatar => {
      avatar.src = data.newAvatar;
    });
    
    if (data.userId === currentUser.id || data.username.toLowerCase() === currentUser.username.toLowerCase()) {
      document.getElementById('current-user-avatar').src = data.newAvatar;
      currentUser.avatar = data.newAvatar;
      
      try {
        const savedUserData = localStorage.getItem('yy4oooGramUserData');
        if (savedUserData) {
          const userData = JSON.parse(savedUserData);
          userData.avatar = data.newAvatar;
          localStorage.setItem('yy4oooGramUserData', JSON.stringify(userData));
        }
      } catch (error) {
        console.error("Ошибка при обновлении аватарки в localStorage:", error);
      }
    }
  });
  
  socket.on('userJoined', (user) => {
    const existingUser = document.getElementById(`user-${user.id}`);
    if (existingUser) {
      const avatarElement = existingUser.querySelector('.userAvatar');
      if (avatarElement) {
        avatarElement.src = user.avatar;
      }
      
      const messages = document.querySelectorAll(`.messageWrapper:not(.myMessage) .userAvatar[alt="${user.username}"]`);
      messages.forEach(avatar => {
        avatar.src = user.avatar;
      });
      
      if (user.id === currentUser.id) {
        document.getElementById('current-user-avatar').src = user.avatar;
        currentUser.avatar = user.avatar;
        
        try {
          const savedUserData = localStorage.getItem('yy4oooGramUserData');
          if (savedUserData) {
            const userData = JSON.parse(savedUserData);
            userData.avatar = user.avatar;
            localStorage.setItem('yy4oooGramUserData', JSON.stringify(userData));
          }
        } catch (error) {
          console.error("Ошибка при обновлении аватарки в localStorage:", error);
        }
      }
      
      createNotificationToast(`${user.username} вернулся в чат`);
    } else {
      addUserToList(user);
      createNotificationToast(`${user.username} присоединился к чату`);
    }
  });
  
  socket.on('userLeft', (user) => {
    removeUser(user.id);
    createNotificationToast(`${user.username} покинул чат`);
    
    typingUsers.delete(user.id);
    updateTypingIndicator();
  });
  
  socket.on('userTyping', (user) => {
    if (user.id !== currentUser.id) {
      typingUsers.add(user.id);
      updateTypingIndicator();
    }
  });
  
  socket.on('userStoppedTyping', (user) => {
    typingUsers.delete(user.id);
    updateTypingIndicator();
  });
  
  // Добавляем обработчик клика на аватарку текущего пользователя для её изменения
  const currentUserAvatar = document.getElementById('current-user-avatar');
  if (currentUserAvatar) {
    currentUserAvatar.style.cursor = 'pointer';
    currentUserAvatar.title = 'Нажмите, чтобы изменить аватарку';
    
    currentUserAvatar.addEventListener('click', showAvatarSelector);
  }
}

function updateTypingIndicator() {
  const typingIndicator = document.getElementById('typing-indicator');
  
  if (typingUsers.size === 0) {
    if (typingIndicator.classList.contains('active')) {
      typingIndicator.classList.add('inactive');
      typingIndicator.classList.remove('active');
      
      setTimeout(() => {
        typingIndicator.textContent = '';
        typingIndicator.classList.remove('inactive');
      }, 500);
    }
    return;
  }
  
  const typingUserNames = Array.from(typingUsers)
    .map(userId => {
      const userElement = document.getElementById(`user-${userId}`);
      if (userElement) {
        return userElement.querySelector('.userName').textContent;
      }
      return null;
    })
    .filter(name => name !== null);
  
  // Update the text content
  if (typingUserNames.length === 1) {
    typingIndicator.textContent = `${typingUserNames[0]} печатает...`;
  } else if (typingUserNames.length === 2) {
    typingIndicator.textContent = `${typingUserNames[0]} и ${typingUserNames[1]} печатают...`;
  } else if (typingUserNames.length > 2) {
    typingIndicator.textContent = `${typingUserNames.length} пользователей печатают...`;
  } else {
    typingIndicator.textContent = '';
  }
  
  // Apply the active class if there's text and not already active
  if (typingIndicator.textContent && !typingIndicator.classList.contains('active')) {
    typingIndicator.classList.remove('inactive');
    typingIndicator.classList.add('active');
  }
}

function showConnectionInfo() {
  console.log("Информационное окно отключено");
}

function setupLoginForm() {
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username-input');
  
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const tunnelUrl = document.getElementById('tunnel-url').value.trim();
    
    if (!username) {
      showConfirmModal("Поле не заполнено", "Пожалуйста, введите ваше имя", false);
      return;
    }
    
    if (username.length < 3 || username.length > 20) {
      showConfirmModal("Некорректное имя", "Имя должно содержать от 3 до 20 символов", false);
      return;
    }
    
    if (!tunnelUrl) {
      showConfirmModal("Поле не заполнено", "Пожалуйста, введите URL сервера", false);
      return;
    }
    
    completeLogin(username, tunnelUrl);
  });
}

function completeLogin(username, tunnelUrl) {
  let formattedUrl = tunnelUrl.trim();
  
  if (!formattedUrl.match(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+(:[0-9]+)?(\/.*)?$/)) {
    showConfirmModal(
      "Некорректный URL", 
      "Введенный URL имеет некорректный формат. Пример правильного формата: example.ngrok.io", 
      false
    );
    return;
  }
  
  console.log("Подготовка к подключению:");
  console.log("- URL:", formattedUrl);
  console.log("- Имя пользователя:", username);
  
  const mainSocket = initializeSocket(formattedUrl);
  
  if (mainSocket) {
    showConfirmModal(
      `Подтвердите действие на ${formattedUrl}`,
      `Вы хотите подключиться к серверу как ${username}?`,
      true,
      () => {
        const savedUserData = localStorage.getItem('yy4oooGramUserData');
        let userId = null;
        
        if (savedUserData) {
          try {
            const userData = JSON.parse(savedUserData);
            if (userData.username && userData.username.toLowerCase() === username.toLowerCase()) {
              userId = userData.id;
            }
          } catch (e) {
            console.error("Ошибка при чтении данных пользователя:", e);
          }
        }
        
        joinChat(mainSocket, username, userId);
      }
    );
  }
}

// Функция для входа в чат
function joinChat(socket, username, userId) {
  const userData = {
    username: username
  };
  
  if (userId) {
    userData.id = userId;
  }
  
  console.log("Отправляем данные пользователя:", userData);
  
  socket.once('welcome', (data) => {
    console.log("Получено приветствие от сервера:", data);
    
    // Инициализируем чат после получения приветствия
    initChat(data);
    
    if (data && data.user && data.user.id) {
      try {
        localStorage.setItem('yy4oooGramUserData', JSON.stringify({
          id: data.user.id,
          username: username,
          avatar: data.user.avatar
        }));
        console.log("ID пользователя сохранен:", data.user.id);
      } catch (error) {
        console.error("Ошибка при сохранении данных пользователя:", error);
      }
    }
  });
  
  socket.emit('join', userData);
  
  setTimeout(() => {
    if (document.getElementById('login-form').style.display !== 'none') {
      console.log("Не получено подтверждение входа, возможно проблема с подключением");
      showConfirmModal(
        "Проблема с подключением", 
        "Не удалось войти в чат. Проверьте URL сервера и попробуйте снова.", 
        false
      );
    }
  }, 5000);
}

function initializeSocket(ngrokUrl, isTemp = false) {
  try {
    if (typeof io === 'undefined') {
      console.error('Socket.IO library is not loaded');
      if (!isTemp) {
        showConfirmModal(
          "Ошибка инициализации", 
          "Библиотека Socket.IO не загружена. Проверьте подключение к интернету и перезагрузите страницу.", 
          false
        );
      }
      return null;
    }
    
    if (!ngrokUrl || ngrokUrl.trim() === '') {
      console.error('Empty URL provided');
      if (!isTemp) {
        showConfirmModal("Ошибка подключения", "Не указан URL сервера", false);
      }
      return null;
    }
    
    let socketUrl = ngrokUrl.trim();
    
    if (socketUrl.endsWith('/')) {
      socketUrl = socketUrl.slice(0, -1);
    }
    
    if (!socketUrl.startsWith('http://') && !socketUrl.startsWith('https://')) {
      socketUrl = `https://${socketUrl}`;
    }
    
    console.log(`Connecting to socket at ${socketUrl}`);
    
    if (socket && !isTemp) {
      socket.disconnect();
    }
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RETRY_ATTEMPTS,
      reconnectionDelay: 1000,
      timeout: 10000 
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      connectionAttempts = 0;
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      connectionAttempts++;
      
      if (connectionAttempts <= MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying connection (${connectionAttempts}/${MAX_RETRY_ATTEMPTS})...`);
        setTimeout(() => {
          newSocket.connect();
        }, 2000);
      } else {
        if (!isTemp) {
          showConfirmModal(
            "Ошибка подключения", 
            `Не удалось подключиться к серверу по адресу ${socketUrl}. Проверьте URL и убедитесь, что сервер запущен.`, 
            false
          );
        }
      }
    });
    
    if (!isTemp) {
      socket = newSocket;
      setupChatEvents();
    }
    
    return newSocket;
  } catch (error) {
    console.error('Failed to initialize socket:', error);
    if (!isTemp) {
      showConfirmModal("Ошибка инициализации", "Произошла ошибка при инициализации соединения", false);
    }
    return null;
  }
}

function showConfirmModal(title, message, showCancel = true, confirmCallback = null) {
  const modal = document.getElementById('confirm-action-modal');
  const titleEl = document.getElementById('confirm-title');
  const messageEl = document.getElementById('confirm-message');
  const cancelBtn = document.getElementById('cancel-action');
  const confirmBtn = document.getElementById('confirm-action');
  const overlay = document.getElementById('modal-overlay');
  
  titleEl.textContent = title;
  messageEl.textContent = message;
  
  cancelBtn.style.display = showCancel ? 'block' : 'none';
  
  const closeModal = () => {
    modal.style.display = 'none';
    overlay.style.display = 'none';
    cancelBtn.removeEventListener('click', closeModal);
    confirmBtn.removeEventListener('click', handleConfirm);
  };
  
  const handleConfirm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirmCallback) {
      confirmCallback();
    }
    closeModal();
  };
  
  modal.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  overlay.addEventListener('click', closeModal);
  
  cancelBtn.addEventListener('click', closeModal);
  confirmBtn.addEventListener('click', handleConfirm);
  
  overlay.style.display = 'block';
  modal.style.display = 'block';
}

function checkNetworkStatus() {
  return navigator.onLine;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkNetworkStatus()) {
    showConfirmModal(
      "Нет подключения к интернету", 
      "Проверьте ваше интернет-соединение и перезагрузите страницу.", 
      false
    );
  }
  
  window.addEventListener('online', () => {
    console.log('Соединение с интернетом восстановлено');
    createNotificationToast('Соединение с интернетом восстановлено');
    
    if (socket) {
      socket.connect();
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('Соединение с интернетом потеряно');
    createNotificationToast('Соединение с интернетом потеряно');
    showConfirmModal(
      "Нет подключения к интернету", 
      "Проверьте ваше интернет-соединение для продолжения работы чата.", 
      false
    );
  });
  
  setupLoginForm();
  
  document.addEventListener('click', function(e) {
    if (activeMessageMenu && !e.target.closest('.message-context-menu') && !e.target.closest('.message-actions')) {
      closeMessageMenu();
    }
  });
});

// Добавляем функцию для обновления аватарки
function updateUserAvatar(newAvatarSrc) {
  if (!socket || !currentUser.username) return;
  
  socket.emit('updateAvatar', {
    avatar: newAvatarSrc
  }, (response) => {
    if (response && response.success) {
      console.log('Аватарка успешно обновлена');
    } else {
      console.error('Ошибка при обновлении аватарки');
    }
  });
}

// Функция для отображения селектора аватарок
function showAvatarSelector() {
  // Создаем модальное окно для выбора аватарки
  const modal = document.createElement('div');
  modal.className = 'avatar-selector-modal';
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.backgroundColor = 'var(--card-background)';
  modal.style.borderRadius = '16px';
  modal.style.padding = '20px';
  modal.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.5)';
  modal.style.zIndex = '1000';
  modal.style.maxWidth = '90%';
  modal.style.width = '400px';
  modal.style.border = '1px solid var(--border-color)';
  
  // Заголовок
  const title = document.createElement('h3');
  title.textContent = 'Выберите новую аватарку';
  title.style.textAlign = 'center';
  title.style.marginTop = '0';
  title.style.marginBottom = '20px';
  title.style.color = 'var(--text-color)';
  modal.appendChild(title);
  
  // Контейнер для аватарок
  const avatarContainer = document.createElement('div');
  avatarContainer.style.display = 'flex';
  avatarContainer.style.flexWrap = 'wrap';
  avatarContainer.style.justifyContent = 'center';
  avatarContainer.style.gap = '10px';
  avatarContainer.style.marginBottom = '20px';
  modal.appendChild(avatarContainer);
  
  // Добавляем аватарки
  const totalAvatars = 18;
  let selectedAvatarIndex = null;
  
  for (let i = 1; i <= totalAvatars; i++) {
    const avatarOption = document.createElement('img');
    avatarOption.src = `Images/Avatars/avatar${i}.png`;
    avatarOption.className = 'avatarOption';
    avatarOption.style.width = '50px';
    avatarOption.style.height = '50px';
    avatarOption.style.borderRadius = '50%';
    avatarOption.style.cursor = 'pointer';
    avatarOption.style.border = '2px solid transparent';
    avatarOption.style.transition = 'all 0.2s ease';
    
    // Если это текущая аватарка, выделяем её
    if (currentUser.avatar && currentUser.avatar.includes(`avatar${i}.png`)) {
      avatarOption.style.border = '2px solid var(--accent-color)';
      avatarOption.style.boxShadow = '0 0 0 2px rgba(186, 104, 200, 0.3)';
      selectedAvatarIndex = i;
    }
    
    avatarOption.addEventListener('click', function() {
      // Убираем выделение со всех аватарок
      const allAvatars = avatarContainer.querySelectorAll('.avatarOption');
      allAvatars.forEach(avatar => {
        avatar.style.border = '2px solid transparent';
        avatar.style.boxShadow = 'none';
      });
      
      // Выделяем выбранную аватарку
      this.style.border = '2px solid var(--accent-color)';
      this.style.boxShadow = '0 0 0 2px rgba(186, 104, 200, 0.3)';
      selectedAvatarIndex = i;
    });
    
    avatarContainer.appendChild(avatarOption);
  }
  
  // Кнопки действий
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.justifyContent = 'center';
  buttonsContainer.style.gap = '10px';
  modal.appendChild(buttonsContainer);
  
  // Кнопка отмены
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Отмена';
  cancelButton.className = 'confirm-button';
  cancelButton.style.padding = '10px 20px';
  cancelButton.style.borderRadius = '8px';
  cancelButton.style.border = '1px solid var(--border-color)';
  cancelButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  cancelButton.style.color = 'var(--text-color)';
  cancelButton.style.cursor = 'pointer';
  cancelButton.addEventListener('click', function() {
    document.body.removeChild(overlay);
    document.body.removeChild(modal);
  });
  buttonsContainer.appendChild(cancelButton);
  
  // Кнопка сохранения
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Сохранить';
  saveButton.className = 'confirm-button primary';
  saveButton.style.padding = '10px 20px';
  saveButton.style.borderRadius = '8px';
  saveButton.style.border = 'none';
  saveButton.style.background = 'var(--button-gradient)';
  saveButton.style.color = 'white';
  saveButton.style.cursor = 'pointer';
  saveButton.addEventListener('click', function() {
    if (selectedAvatarIndex !== null) {
      const newAvatarSrc = `Images/Avatars/avatar${selectedAvatarIndex}.png`;
      updateUserAvatar(newAvatarSrc);
    }
    document.body.removeChild(overlay);
    document.body.removeChild(modal);
  });
  buttonsContainer.appendChild(saveButton);
  
  // Создаем затемнение
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  overlay.style.zIndex = '999';
  overlay.addEventListener('click', function() {
    document.body.removeChild(overlay);
    document.body.removeChild(modal);
  });
  
  // Предотвращаем закрытие при клике на модальное окно
  modal.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  // Добавляем элементы на страницу
  document.body.appendChild(overlay);
  document.body.appendChild(modal);
}