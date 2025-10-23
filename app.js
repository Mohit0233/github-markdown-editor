// Application utility functions extracted from index.html
// Depends on global `editor`, `formatMarkdownInline`, `saveContent`, `getSavedContent`.

function updateMarkdown() {
  const markdownText = editor.getValue();
  saveContent(markdownText);
  renderMarkdown(markdownText);
}

function renderMarkdown(markdownText) {
  const html = marked.parse(markdownText);
  const outEl = document.getElementById('markdown-output');
  if (outEl) outEl.innerHTML = html;
  highlightCodeBlocks();
}

function highlightCodeBlocks() {
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
  });
}

function copyMarkdown() {
  const markdownText = editor.getValue();
  navigator.clipboard.writeText(markdownText)
    .then(() => updateCopyButton(true))
    .catch(err => {
      console.error('Failed to copy:', err);
      updateCopyButton(false);
    });
}

function updateCopyButton(success) {
  const copyIcon = document.getElementById('copy-icon');
  if (!copyIcon) return;
  if (success) {
    const originalHTML = copyIcon.innerHTML;
    copyIcon.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;
    setTimeout(() => { copyIcon.innerHTML = originalHTML; }, 300);
  }
}

function initResizer() {
  const resizer = document.getElementById('resizer');
  const leftPanel = document.querySelector('.editor-container');
  const rightPanel = document.querySelector('.markdown-container');
  if (!resizer || !leftPanel || !rightPanel) return;
  let isResizing = false;
  resizer.addEventListener('mousedown', startResize);
  function startResize() {
    isResizing = true;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  }
  function resize(event) {
    if (!isResizing) return;
    const totalWidth = window.innerWidth;
    const newLeftWidth = (event.clientX / totalWidth) * 100;
    const newRightWidth = 100 - newLeftWidth;
    if (newLeftWidth > 20 && newRightWidth > 20) {
      leftPanel.style.width = `${newLeftWidth}%`;
      rightPanel.style.width = `${newRightWidth}%`;
    }
  }
  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
  }
}

function setupKeyboardShortcuts() {
  const output = document.getElementById('markdown-output');
  if (!output) return;
  output.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      selectAllContent(this);
    }
  });
}

function selectAllContent(element) {
  if (!element) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function setupEventListeners() {
  const copyBtn = document.getElementById('copy-button');
  if (copyBtn) copyBtn.addEventListener('click', copyMarkdown);
  const mdContainer = document.getElementById('markdown-container');
  if (mdContainer) mdContainer.addEventListener('click', () => {
    const out = document.getElementById('markdown-output');
    if (out) out.focus();
  });
  initializePasteBoxBehavior();
  initResizer();
  setupKeyboardShortcuts();
}

function initializePasteBoxBehavior() {
  const pb = document.getElementById('paste-box');
  if (!pb) return;
  const instruction = 'Paste rich content here (Markdown / HTML) – it will convert & insert into the editor.';
  pb.addEventListener('keydown', (e) => {
    const isPaste = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v';
    const isSelectAll = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a';
    if (isPaste || isSelectAll) return;
    e.preventDefault();
  });
  pb.addEventListener('input', () => {
    if (pb.textContent.trim() && !pb.textContent.includes('Paste rich content here')) {
      pb.textContent = instruction;
    }
  });
  pb.addEventListener('focus', () => {
    if (!pb.textContent.trim()) pb.textContent = instruction;
  });
}

// Expose needed functions globally (optional if inline script expects them)
window.updateMarkdown = updateMarkdown;
window.renderMarkdown = renderMarkdown;
window.highlightCodeBlocks = highlightCodeBlocks;
window.copyMarkdown = copyMarkdown;
window.updateCopyButton = updateCopyButton;
window.initResizer = initResizer;
window.setupKeyboardShortcuts = setupKeyboardShortcuts;
window.selectAllContent = selectAllContent;
window.setupEventListeners = setupEventListeners;
window.initializePasteBoxBehavior = initializePasteBoxBehavior;