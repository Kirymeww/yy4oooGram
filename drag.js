document.addEventListener('DOMContentLoaded', function() {
  const dragWrapper = document.getElementById('chatDragWrapper');
  const chat = document.getElementById('chatWrapper');
  const header = chat.querySelector('header');
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  function isDesktop() {
    return window.innerWidth > 768;
  }

  header.style.cursor = 'move';
  dragWrapper.style.position = 'fixed';
  dragWrapper.style.left = '50%';
  dragWrapper.style.top = '50%';
  dragWrapper.style.transform = 'translate(-50%, -50%)';
  dragWrapper.style.zIndex = '100';

  header.addEventListener('mousedown', function(e) {
    if (!isDesktop()) return;
    isDragging = true;
    const rect = dragWrapper.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    dragWrapper.style.left = e.clientX - offsetX + 'px';
    dragWrapper.style.top = e.clientY - offsetY + 'px';
    dragWrapper.style.transform = '';
  });

  document.addEventListener('mouseup', function() {
    isDragging = false;
    document.body.style.userSelect = '';
  });
}); 