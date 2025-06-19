let socket = null;
let nick = '';
let lastErrorToast = '';
let wasConnectError = false;
let deleteModal = null;
let messageToDeleteId = null;
let editMessageId = null;
let editInput = null;
let savedTunnel = '';
let savedNick = '';
let serverAvailable = false;
let usersModal = null;
let messageActionsTooltip = null;
let messageActionsOverlay = null;

const loginWrapper = document.getElementById('loginWrapper');
const chatWrapper = document.getElementById('chatWrapper');
const tunnelInput = document.getElementById('tunnelInput');
const nickInput = document.getElementById('nickInput');
const enterBtn = document.getElementById('enterBtn');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const loginError = document.getElementById('loginError');

const avatars = [
  'Images/Avatars/avatar1.png',
  'Images/Avatars/avatar2.png',
  'Images/Avatars/avatar3.png',
  'Images/Avatars/avatar4.png',
  'Images/Avatars/avatar5.png',
  'Images/Avatars/avatar6.png',
  'Images/Avatars/avatar7.png',
  'Images/Avatars/avatar8.png',
  'Images/Avatars/avatar9.png',
  'Images/Avatars/avatar10.png',
  'Images/Avatars/avatar11.png',
  'Images/Avatars/avatar12.png',
  'Images/Avatars/avatar13.png',
  'Images/Avatars/avatar14.png',
  'Images/Avatars/avatar15.png',
  'Images/Avatars/avatar16.png',
  'Images/Avatars/avatar17.png',
  'Images/Avatars/avatar18.png'
];

function getAvatarForUser(user) {
  let hash = 0;
  for (let i = 0; i < user.length; i++) {
    const char = user.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const avatarIndex = Math.abs(hash) % avatars.length;
  return avatars[avatarIndex];
}

function showMessageActionsTooltip(msgId, event) {
  closeMessageActionsTooltip();
  
  messageToDeleteId = msgId;
  
  messageActionsOverlay = document.createElement('div');
  messageActionsOverlay.className = 'message-actions-overlay';
  messageActionsOverlay.onclick = closeMessageActionsTooltip;
  document.body.appendChild(messageActionsOverlay);
  
  messageActionsTooltip = document.createElement('div');
  messageActionsTooltip.className = 'message-actions-tooltip';
  messageActionsTooltip.innerHTML = `
    <button class="message-action-btn edit-btn" title="Редактировать">✏️</button>
    <button class="message-action-btn delete-btn" title="Удалить">🗑️</button>
    <button class="message-action-btn close-btn" title="Закрыть">✕</button>
  `;
  
  document.body.appendChild(messageActionsTooltip);
  
  const messageElement = document.querySelector(`.message[data-id='${msgId}']`);
  if (!messageElement) {
    closeMessageActionsTooltip();
    return;
  }
  
  const messageRect = messageElement.getBoundingClientRect();
  const tooltipRect = messageActionsTooltip.getBoundingClientRect();
  
  let x, y;
  
  const isMobile = window.innerWidth <= 600;
  
  if (isMobile) {
    x = (window.innerWidth - tooltipRect.width) / 2;
    y = Math.max(10, messageRect.top - tooltipRect.height - 10);
    
    if (y < 10) {
      y = messageRect.bottom + 10;
    }
  } else {
    x = event.clientX - tooltipRect.width / 2;
    y = event.clientY + 10;
  }
  
  const maxX = window.innerWidth - tooltipRect.width - 10;
  const maxY = window.innerHeight - tooltipRect.height - 10;
  
  messageActionsTooltip.style.left = Math.max(10, Math.min(x, maxX)) + 'px';
  messageActionsTooltip.style.top = Math.max(10, Math.min(y, maxY)) + 'px';
  
  const editBtn = messageActionsTooltip.querySelector('.edit-btn');
  const deleteBtn = messageActionsTooltip.querySelector('.delete-btn');
  const closeBtn = messageActionsTooltip.querySelector('.close-btn');
  
  editBtn.onclick = (e) => {
    e.stopPropagation();
    startEditMessage(msgId);
    closeMessageActionsTooltip();
  };
  
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    if (socket && messageToDeleteId) {
      socket.emit('delete_message', messageToDeleteId);
    }
    closeMessageActionsTooltip();
  };
  
  closeBtn.onclick = () => {
    closeMessageActionsTooltip();
  };
  
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeMessageActionsTooltip();
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  messageActionsTooltip._escapeHandler = handleEscape;
}

function closeMessageActionsTooltip() {
  if (messageActionsTooltip) {
    if (messageActionsTooltip._escapeHandler) {
      document.removeEventListener('keydown', messageActionsTooltip._escapeHandler);
    }
    
    messageActionsTooltip.classList.add('tooltip-fade-out');
    
    setTimeout(() => {
      if (messageActionsTooltip) {
        messageActionsTooltip.remove();
        messageActionsTooltip = null;
      }
    }, 250);
  }
  
  if (messageActionsOverlay) {
    messageActionsOverlay.remove();
    messageActionsOverlay = null;
  }
  
  messageToDeleteId = null;
}

function showEditInput(msgId, currentText) {
  if (editInput) editInput.remove();
  editMessageId = msgId;
  const msgDiv = document.querySelector(`.message[data-id='${msgId}'] .msgContent`);
  if (!msgDiv) return;
  editInput = document.createElement('div');
  editInput.className = 'editInputWrapper';
  editInput.innerHTML = `
    <input type="text" class="editInput" value="${currentText.replace(/"/g, '&quot;')}">
    <button class="saveEditBtn"></button>
    <button class="cancelEditBtn">Отмена</button>
  `;
  msgDiv.innerHTML = '';
  msgDiv.appendChild(editInput);
  editInput.querySelector('.editInput').focus();
  editInput.querySelector('.saveEditBtn').onclick = () => {
    const newText = editInput.querySelector('.editInput').value.trim();
    if (newText && socket && editMessageId) {
      socket.emit('edit_message', { id: editMessageId, msg: newText });
    }
    editInput.remove();
    editInput = null;
    editMessageId = null;
  };
  editInput.querySelector('.cancelEditBtn').onclick = () => {
    editInput.remove();
    editInput = null;
    editMessageId = null;
    socket.emit('request_history');
  };
}

function addMessage(data, type = 'msg') {
  const div = document.createElement('div');
  div.classList.add('message');
  if (data.id) div.dataset.id = data.id;
  if(type === 'me') {
    div.classList.add('me');
    const content = document.createElement('div');
    content.className = 'msgContent';
    const textSpan = document.createElement('span');
    textSpan.className = 'text';
    textSpan.textContent = data.msg;
    content.appendChild(textSpan);
    if (data.edited) {
      const editedSpan = document.createElement('span');
      editedSpan.className = 'msg-edited';
      editedSpan.textContent = 'изменено';
      content.appendChild(editedSpan);
    }
    div.appendChild(content);
    div.onclick = (event) => showMessageActionsTooltip(data.id, event);
  } else if(type === 'msg') {
    div.classList.add('other');
    const avatar = document.createElement('img');
    avatar.src = getAvatarForUser(data.user);
    avatar.alt = 'avatar';
    avatar.className = 'avatar';
    div.appendChild(avatar);
    const content = document.createElement('div');
    content.className = 'msgContent';
    const nickSpan = document.createElement('span');
    nickSpan.className = 'nick';
    nickSpan.textContent = data.user;
    const textSpan = document.createElement('span');
    textSpan.className = 'text';
    textSpan.textContent = data.msg;
    content.appendChild(nickSpan);
    content.appendChild(textSpan);
    if (data.edited) {
      const editedSpan = document.createElement('span');
      editedSpan.className = 'msg-edited';
      editedSpan.textContent = 'изменено';
      content.appendChild(editedSpan);
    }
    if (data.user === nick) {
      div.onclick = (event) => showMessageActionsTooltip(data.id, event);
    }
    div.appendChild(content);
  } else if(type === 'system') {
    div.classList.add('system');
    div.textContent = data;
  }
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showError(text) {
  if (lastErrorToast === text) return;
  lastErrorToast = text;
  showToast(text);
}

function showToast(text, user = null) {
  const container = document.getElementById('toastContainer');
  if (container.childElementCount >= 3) {
    container.removeChild(container.firstChild);
  }
  for (let toast of container.children) {
    const toastText = toast.querySelector('.toast-text');
    if (toastText && toastText.textContent === text) return;
  }

  const toast = document.createElement('div');
  toast.className = 'toast toast-animate';
  
  if (user) {
    const avatar = document.createElement('img');
    avatar.src = getAvatarForUser(user);
    avatar.alt = 'avatar';
    avatar.className = 'toast-avatar';
    toast.appendChild(avatar);
    
    const content = document.createElement('div');
    content.className = 'toast-content';
    
    const nickSpan = document.createElement('span');
    nickSpan.className = 'toast-nick';
    nickSpan.textContent = user;
    content.appendChild(nickSpan);
    
    const textSpan = document.createElement('span');
    textSpan.className = 'toast-text';
    textSpan.textContent = text;
    content.appendChild(textSpan);
    
    toast.appendChild(content);
  } else {
    const textSpan = document.createElement('span');
    textSpan.className = 'toast-text';
    textSpan.textContent = text;
    toast.appendChild(textSpan);
  }
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      toast.remove();
      if (lastErrorToast === text) lastErrorToast = '';
    }, 400);
  }, 3000);
}

enterBtn.onclick = () => {
  wasConnectError = false;
  const tunnel = tunnelInput.value.trim();
  nick = nickInput.value.trim();

  if(!tunnel || !nick) {
    showError('Нужно ввести ngrok URL и ник!');
    return;
  }

  savedTunnel = tunnel;
  savedNick = nick;

  loginError.textContent = '';
  socket = io(tunnel, { transports: ['websocket'] });

  socket.on('connect', () => {
    socket.emit('join', nick);
  });

  socket.on('join_error', (errMsg) => {
    chatWrapper.classList.add('hidden');
    loginWrapper.classList.remove('hidden');
    showError(errMsg);
    socket.disconnect();
  });

  socket.on('user_joined', (username) => {
    if (username === nick) {
      loginWrapper.classList.add('hidden');
      chatWrapper.classList.remove('hidden');
      showToast('Вы вошли в чат как ' + nick);
      serverAvailable = true;
    } else {
      showToast('вошёл в чат', username);
    }
    requestUsersIfModalOpen();
  });

  socket.on('connect_error', (err) => {
    if (!wasConnectError) {
      showError('Ошибка подключения: ' + err.message);
      wasConnectError = true;
      serverAvailable = false;
      
      checkServerAvailability();
    }
  });

  socket.on('message', (data) => {
    if(typeof data === 'object' && data.user && data.msg) {
      addMessage(data, data.user === nick ? 'me' : 'msg');
    }
  });

  socket.on('history', (history) => {
    messagesDiv.innerHTML = '';
    for(const data of history) {
      if(typeof data === 'object' && data.user && data.msg) {
        addMessage(data, data.user === nick ? 'me' : 'msg');
      }
    }
  });

  socket.on('user_left', (username) => {
    showToast('вышел из чата', username);
    requestUsersIfModalOpen();
  });

  socket.on('disconnect', () => {
    addMessage('Соединение с сервером потеряно', 'system');
    serverAvailable = false;
  });

  socket.on('edit_message', (data) => {
    const msgDiv = document.querySelector(`.message[data-id='${data.id}'] .text`);
    if (msgDiv) msgDiv.textContent = data.msg;
    const msgContent = msgDiv?.parentElement;
    if (msgContent && !msgContent.querySelector('.msg-edited')) {
      const editedSpan = document.createElement('span');
      editedSpan.className = 'msg-edited';
      editedSpan.textContent = 'изменено';
      msgContent.appendChild(editedSpan);
    }
    if (editingMsgId === data.id) stopEditMessage();
  });

  socket.on('request_history', () => {
    socket.emit('history');
  });

  const usersBtn = document.getElementById('usersBtn');
  if (usersBtn) {
    usersBtn.onclick = () => {
      if (socket) {
        socket.emit('get_users');
      }
    };
  }
  socket.on('users_list', (users) => {
    showUsersModal(users);
  });
};

function checkServerAvailability() {
  if (serverAvailable || !savedTunnel || !savedNick) return;
  
  const testSocket = io(savedTunnel, { transports: ['websocket'], timeout: 5000 });
  
  testSocket.on('connect', () => {
    if (!serverAvailable) {
      serverAvailable = true;
    }
    testSocket.disconnect();
  });
  
  testSocket.on('connect_error', () => {
    setTimeout(() => {
      if (!serverAvailable) {
        checkServerAvailability();
      }
    }, 10000);
  });
  
  testSocket.on('disconnect', () => {
  });
}

function handleEnter() {
  const tunnel = tunnelInput.value.trim();
  nick = nickInput.value.trim();

  if(!tunnel || !nick) {
    showError('Нужно ввести ngrok URL и ник!');
    return;
  }

  enterBtn.click();
}

tunnelInput.addEventListener('keydown', e => {
  if(e.key === 'Enter') {
    e.preventDefault();
    handleEnter();
  }
});

nickInput.addEventListener('keydown', e => {
  if(e.key === 'Enter') {
    e.preventDefault();
    handleEnter();
  }
});

let editingMsgId = null;
let originalSendBtnHTML = null;

function startEditMessage(msgId) {
  const msgDiv = document.querySelector(`.message[data-id='${msgId}'] .text`);
  if (!msgDiv) return;
  editingMsgId = msgId;
  messageInput.value = msgDiv.textContent;
  messageInput.focus();
  if (!originalSendBtnHTML) originalSendBtnHTML = sendBtn.innerHTML;
  sendBtn.classList.add('edit-mode');
}

function stopEditMessage() {
  editingMsgId = null;
  sendBtn.classList.remove('edit-mode');
  messageInput.value = '';
}

sendBtn.onclick = () => {
  const msg = messageInput.value.trim();
  if(!msg || !socket) return;
  if (editingMsgId) {
    socket.emit('edit_message', { id: editingMsgId, msg });
    stopEditMessage();
    return;
  }
  socket.emit('message', { user: nick, msg });
  messageInput.value = '';
};

messageInput.addEventListener('keydown', e => {
  if(e.key === 'Enter') {
    e.preventDefault();
    sendBtn.click();
  } else if (e.key === 'Escape' && editingMsgId) {
    stopEditMessage();
  }
});

function showUsersModal(users) {
  if (usersModal) usersModal.remove();
  usersModal = document.createElement('div');
  usersModal.id = 'usersModalWrapper';
  
  const currentUser = users.find(u => u === nick);
  const otherUsers = users.filter(u => u !== nick);
  
  otherUsers.sort();
  
  usersModal.innerHTML = `
    <div id="usersModal" class="centered">
      <h2>Участники группы</h2>
      <div class="users-list">
        ${currentUser ? `
          <div class="user-tile current-user">
            <img src="${getAvatarForUser(currentUser)}" class="user-tile-avatar" alt="avatar" />
            <div class="user-tile-info">
              <span class="user-tile-nick">${currentUser}</span>
              <span class="user-tile-label">Это вы.</span>
            </div>
          </div>
          <div class="users-separator"></div>
        ` : ''}
        ${otherUsers.map(u => `
          <div class="user-tile">
            <img src="${getAvatarForUser(u)}" class="user-tile-avatar" alt="avatar" />
            <span class="user-tile-nick">${u}</span>
          </div>
        `).join('')}
      </div>
      <button class="cancel-btn" id="closeUsersBtn">Закрыть</button>
    </div>
  `;
  document.body.appendChild(usersModal);
  document.getElementById('closeUsersBtn').onclick = closeUsersModal;
}

function closeUsersModal() {
  if (usersModal) {
    usersModal.remove();
    usersModal = null;
  }
}

function requestUsersIfModalOpen() {
  if (usersModal && socket) {
    socket.emit('get_users');
  }
}
