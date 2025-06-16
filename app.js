let socket = null;
let nick = '';

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
const userAvatars = {};

function getAvatarForUser(user) {
  if (!userAvatars[user]) {
    userAvatars[user] = avatars[Math.floor(Math.random() * avatars.length)];
  }
  return userAvatars[user];
}

function addMessage(data, type = 'msg') {
  const div = document.createElement('div');
  div.classList.add('message');
  if(type === 'me') {
    div.classList.add('me');
    const content = document.createElement('div');
    content.className = 'msgContent';
    const nickSpan = document.createElement('span');
    nickSpan.className = 'nick';
    nickSpan.textContent = data.user || '';
    const textSpan = document.createElement('span');
    textSpan.className = 'text';
    textSpan.textContent = data.msg;
    content.appendChild(nickSpan);
    content.appendChild(textSpan);
    div.appendChild(content);
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
    div.appendChild(content);
  } else if(type === 'system') {
    div.classList.add('system');
    div.textContent = data;
  }
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showError(text) {
  showToast(text);
}

function showToast(text, user = null) {
  const container = document.getElementById('toastContainer');
  if (container.childElementCount >= 3) {
    container.removeChild(container.firstChild);
  }
  for (let toast of container.children) {
    if (toast.textContent === text) return;
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  
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
    toast.textContent = text;
  }
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

enterBtn.onclick = () => {
  const tunnel = tunnelInput.value.trim();
  nick = nickInput.value.trim();

  if(!tunnel || !nick) {
    showError('Нужно ввести ngrok URL и ник!');
    return;
  }

  loginError.textContent = '';
  socket = io(tunnel, { transports: ['websocket'] });

  socket.on('connect', () => {
    loginWrapper.classList.add('hidden');
    chatWrapper.classList.remove('hidden');
    showToast('Вы вошли в чат как ' + nick);
    socket.emit('join', nick);
  });

  socket.on('connect_error', (err) => {
    showError('Ошибка подключения: ' + err.message);
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

  socket.on('user_joined', (username) => {
    if (username !== nick) {
      showToast('вошёл в чат', username);
    }
  });

  socket.on('user_left', (username) => {
    showToast('вышел из чата', username);
  });

  socket.on('disconnect', () => {
    addMessage('Отключились от сервера', 'system');
  });

  messageInput.addEventListener('input', () => {
    if (socket && socket.connected) {
      socket.emit('typing', nick);
    }
  });
};

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

sendBtn.onclick = () => {
  const msg = messageInput.value.trim();
  if(!msg || !socket) return;
  socket.emit('message', { user: nick, msg });
  messageInput.value = '';
};

messageInput.addEventListener('keydown', e => {
  if(e.key === 'Enter') {
    e.preventDefault();
    sendBtn.click();
  }
});
