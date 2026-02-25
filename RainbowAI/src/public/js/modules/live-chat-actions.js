// ═══════════════════════════════════════════════════════════════════
// Live Chat Actions - Send/reply, context menu, file attachment, input
// ═══════════════════════════════════════════════════════════════════

import { $, avatarImg } from './live-chat-state.js';
import { refreshChat, loadLiveChat, getUserMessage, renderList, formatPhoneForDisplay } from './live-chat-core.js';
import { sendTranslated, sendOriginal } from './live-chat-features.js';

var api = window.api;
var API = window.API || '';

// ─── Actions ─────────────────────────────────────────────────────

export async function deleteChat() {
  if (!$.activePhone) return;
  if (!confirm('Delete this conversation? This cannot be undone.')) return;
  try {
    await api('/conversations/' + encodeURIComponent($.activePhone), { method: 'DELETE' });
    $.activePhone = null;
    document.getElementById('lc-active-chat').style.display = 'none';
    document.getElementById('lc-empty-state').style.display = '';
    loadLiveChat();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}

export async function sendReply() {
  if (!$.activePhone) return;

  // Note mode: save as internal comment instead of sending WhatsApp message
  if ($.noteMode) {
    var noteInput = document.getElementById('lc-input-box');
    var noteText = noteInput ? noteInput.value.trim() : '';
    if (!noteText) return;
    noteInput.value = '';
    noteInput.style.height = 'auto';
    var { saveComment } = await import('./live-chat-panels.js');
    await saveComment(noteText);
    return;
  }

  if ($.selectedFile) {
    await sendMedia();
    return;
  }

  var input = document.getElementById('lc-input-box');
  var message = input ? input.value.trim() : '';
  if (!message && !$.replyingToContent) return;

  var quotedContent = null;
  if ($.replyingToContent) {
    quotedContent = $.replyingToContent;
    message = '> ' + $.replyingToContent.replace(/\n/g, '\n> ') + '\n\n' + (message || '');
    cancelReply();
  }

  // When translation preview is visible, Send button = send translated
  if ($.translatePreview) {
    sendTranslated();
    return;
  }

  var btn = document.getElementById('lc-send-btn');
  btn.disabled = true;

  try {
    var log = $.conversations.find(function (c) { return c.phone === $.activePhone; });
    var instanceId = log ? log.instanceId : undefined;

    await api('/conversations/' + encodeURIComponent($.activePhone) + '/send', {
      method: 'POST',
      body: { message: message, instanceId: instanceId, staffName: $.staffName || 'Staff' }
    });

    input.value = '';
    input.style.height = '42px';
    await refreshChat();
  } catch (err) {
    var msg = err.message || 'Unknown error';
    if (isWhatsAppDisconnectError(msg)) {
      showReconnectionModal();
    } else {
      alert('Failed to send message: ' + msg);
    }
  } finally {
    btn.disabled = false;
    input.focus();
  }
}

// ─── File Attachment ─────────────────────────────────────────────

export function toggleAttachMenu() {
  var menu = document.getElementById('lc-attach-menu');
  if (!menu) return;
  var isVisible = menu.style.display !== 'none';
  menu.style.display = isVisible ? 'none' : '';
}

export function pickFile(type) {
  var menu = document.getElementById('lc-attach-menu');
  if (menu) menu.style.display = 'none';

  // Contact: show phone number input dialog (US-073)
  if (type === 'contact') {
    showContactInputDialog();
    return;
  }

  var inputMap = {
    photo: 'lc-file-photo',
    document: 'lc-file-doc',
    camera: 'lc-file-camera',
    audio: 'lc-file-audio'
  };
  var inputId = inputMap[type] || 'lc-file-doc';
  var input = document.getElementById(inputId);
  if (input) {
    input.value = '';
    input.click();
  }
}

function showContactInputDialog() {
  var existing = document.getElementById('lc-contact-input-modal');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'lc-contact-input-modal';
  overlay.className = 'lc-modal-overlay';
  overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };

  var content = document.createElement('div');
  content.className = 'lc-modal-content';

  var title = document.createElement('div');
  title.className = 'lc-modal-title';
  title.textContent = 'Share Contact';

  var inputWrap = document.createElement('div');
  inputWrap.style.cssText = 'margin-bottom:16px;';

  var label = document.createElement('label');
  label.textContent = 'Phone number';
  label.style.cssText = 'display:block;font-size:13px;color:#667781;margin-bottom:6px;';

  var phoneInput = document.createElement('input');
  phoneInput.type = 'tel';
  phoneInput.placeholder = '+60123456789';
  phoneInput.className = 'lc-field-input';
  phoneInput.style.cssText = 'width:100%;box-sizing:border-box;';
  phoneInput.id = 'lc-contact-phone-input';

  inputWrap.appendChild(label);
  inputWrap.appendChild(phoneInput);

  var buttons = document.createElement('div');
  buttons.className = 'lc-modal-buttons';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'lc-modal-btn lc-modal-btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = function () { overlay.remove(); };

  var sendBtn = document.createElement('button');
  sendBtn.className = 'lc-modal-btn lc-modal-btn-send';
  sendBtn.textContent = 'Send';
  sendBtn.onclick = function () {
    var phone = phoneInput.value.trim();
    if (!phone) return;
    overlay.remove();
    sendContactAsMessage(phone);
  };

  buttons.appendChild(cancelBtn);
  buttons.appendChild(sendBtn);

  content.appendChild(title);
  content.appendChild(inputWrap);
  content.appendChild(buttons);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  setTimeout(function () { phoneInput.focus(); }, 50);
}

async function sendContactAsMessage(phone) {
  if (!$.activePhone) return;
  try {
    var log = $.conversations.find(function (c) { return c.phone === $.activePhone; });
    var instanceId = log ? log.instanceId : undefined;
    await api('/conversations/' + encodeURIComponent($.activePhone) + '/send', {
      method: 'POST',
      body: { message: '[contact: ' + phone + ']', instanceId: instanceId }
    });
    await refreshChat();
    if (window.toast) window.toast('Contact shared', 'success');
  } catch (err) {
    var msg = err.message || 'Unknown error';
    if (isWhatsAppDisconnectError(msg)) {
      showReconnectionModal();
    } else {
      if (window.toast) window.toast('Failed to share contact: ' + msg, 'error');
    }
  }
}

export function fileSelected(inputEl, type) {
  if (!inputEl.files || !inputEl.files[0]) return;
  var file = inputEl.files[0];

  if (file.size > 16 * 1024 * 1024) {
    alert('File too large. Maximum size is 16 MB.');
    inputEl.value = '';
    return;
  }

  $.selectedFile = { file: file, type: type };
  showFilePreview(file);
}

export function showFilePreview(file) {
  var preview = document.getElementById('lc-file-preview');
  var thumbEl = document.getElementById('lc-file-preview-thumb');
  var nameEl = document.getElementById('lc-file-preview-name');
  var sizeEl = document.getElementById('lc-file-preview-size');
  if (!preview) return;

  nameEl.textContent = file.name;
  var sizeKB = file.size / 1024;
  sizeEl.textContent = sizeKB < 1024
    ? sizeKB.toFixed(1) + ' KB'
    : (sizeKB / 1024).toFixed(1) + ' MB';

  if (file.type.startsWith('image/')) {
    var url = URL.createObjectURL(file);
    thumbEl.innerHTML = '<img src="' + url + '" alt="preview" style="width:48px;height:48px;object-fit:cover;border-radius:6px;">';
  } else if (file.type.startsWith('video/')) {
    thumbEl.innerHTML = '<div class="lc-file-thumb-icon" style="background:#e8f5e9;"><svg width="24" height="24" viewBox="0 0 24 24" fill="#00a884"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg></div>';
  } else {
    thumbEl.innerHTML = '<div class="lc-file-thumb-icon" style="background:#e3f2fd;"><svg width="24" height="24" viewBox="0 0 24 24" fill="#1976d2"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg></div>';
  }

  preview.style.display = '';
}

export function clearFile() {
  $.selectedFile = null;
  var preview = document.getElementById('lc-file-preview');
  if (preview) preview.style.display = 'none';
  var captionEl = document.getElementById('lc-file-caption');
  if (captionEl) captionEl.value = '';
  var photoInput = document.getElementById('lc-file-photo');
  if (photoInput) photoInput.value = '';
  var docInput = document.getElementById('lc-file-doc');
  if (docInput) docInput.value = '';
}

export async function sendMedia() {
  if (!$.activePhone || !$.selectedFile) return;

  var btn = document.getElementById('lc-send-btn');
  btn.disabled = true;

  var caption = (document.getElementById('lc-file-caption')?.value || '').trim();
  var log = $.conversations.find(function (c) { return c.phone === $.activePhone; });
  var instanceId = log ? log.instanceId : '';

  var formData = new FormData();
  formData.append('file', $.selectedFile.file);
  formData.append('caption', caption);
  formData.append('instanceId', instanceId || '');

  try {
    var response = await fetch(API + '/conversations/' + encodeURIComponent($.activePhone) + '/send-media', {
      method: 'POST',
      body: formData
    });
    var data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload failed');

    clearFile();
    await refreshChat();
    if (window.toast) window.toast('Sent ' + (data.mediaType || 'file'), 'success');
  } catch (err) {
    var msg = err.message || 'Unknown error';
    if (isWhatsAppDisconnectError(msg)) {
      showReconnectionModal();
    } else {
      alert('Failed to send message: ' + msg);
    }
  } finally {
    btn.disabled = false;
  }
}

// ─── Message context menu ────────────────────────────────────────

export function getMessageDisplayText(msg) {
  if (!msg || !msg.content) return '';
  var content = msg.role === 'assistant' ? getUserMessage(msg.content) : msg.content;
  var mediaMatch = content.match(/^\[(photo|video|document):\s*(.+?)\](.*)$/s);
  if (mediaMatch) {
    var caption = mediaMatch[3].trim();
    return (caption ? '[' + mediaMatch[1] + ': ' + mediaMatch[2] + '] ' + caption : '[' + mediaMatch[1] + ': ' + mediaMatch[2] + ']');
  }
  return content;
}

export function openMessageContextMenu(idx, event) {
  if (idx < 0 || idx >= $.lastMessages.length) return;
  event.preventDefault();
  event.stopPropagation();
  $.contextMenuMsgIdx = idx;

  var menu = document.getElementById('lc-msg-context-menu');
  if (!menu) return;

  // US-005: Position menu adjacent to the message bubble, right-aligned for outgoing
  var bubbleWrap = document.querySelector('#lc-messages [data-msg-idx="' + idx + '"]');
  if (bubbleWrap) {
    var rect = bubbleWrap.getBoundingClientRect();
    var isOutgoing = bubbleWrap.classList.contains('lc-out');
    var menuWidth = 260;
    var menuHeight = 260;
    // Right-align for outgoing, left-align for incoming
    if (isOutgoing) {
      menu.style.left = Math.max(12, rect.right - menuWidth) + 'px';
    } else {
      menu.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth)) + 'px';
    }
    // Open upward if near bottom of viewport
    if (rect.bottom + 8 + menuHeight > window.innerHeight) {
      menu.style.top = Math.max(8, rect.top - menuHeight - 8) + 'px';
    } else {
      menu.style.top = (rect.bottom + 8) + 'px';
    }
  }
  menu.style.display = '';

  if ($.contextMenuCloseHandler) {
    document.removeEventListener('click', $.contextMenuCloseHandler, true);
  }
  $.contextMenuCloseHandler = function (e) {
    if (menu.contains(e.target)) return;
    closeMessageContextMenu();
    document.removeEventListener('click', $.contextMenuCloseHandler, true);
    $.contextMenuCloseHandler = null;
  };
  setTimeout(function () {
    document.addEventListener('click', $.contextMenuCloseHandler, true);
  }, 0);
}

export function closeMessageContextMenu() {
  $.contextMenuMsgIdx = null;
  var menu = document.getElementById('lc-msg-context-menu');
  if (menu) menu.style.display = 'none';
  if ($.contextMenuCloseHandler) {
    document.removeEventListener('click', $.contextMenuCloseHandler, true);
    $.contextMenuCloseHandler = null;
  }
}

export function handleMessageChevronClick(e) {
  var chevron = e.target.closest('.lc-bubble-chevron');
  if (!chevron) return;
  e.preventDefault();
  e.stopPropagation();
  var idx = chevron.getAttribute('data-msg-idx');
  if (idx !== null) openMessageContextMenu(parseInt(idx, 10), e);
}

export function doMessageReply() {
  if ($.contextMenuMsgIdx == null || $.contextMenuMsgIdx >= $.lastMessages.length) return;
  var msg = $.lastMessages[$.contextMenuMsgIdx];
  var text = getMessageDisplayText(msg);
  $.replyingToMsgIdx = $.contextMenuMsgIdx;
  $.replyingToContent = text;
  closeMessageContextMenu();

  var preview = document.getElementById('lc-reply-preview');
  var previewText = document.getElementById('lc-reply-preview-text');
  if (preview && previewText) {
    previewText.textContent = text.length > 80 ? text.substring(0, 77) + '...' : text;
    preview.style.display = 'flex';
  }
  var input = document.getElementById('lc-input-box');
  if (input) input.focus();
}

export function cancelReply() {
  $.replyingToMsgIdx = null;
  $.replyingToContent = '';
  var preview = document.getElementById('lc-reply-preview');
  if (preview) preview.style.display = 'none';
}

export function doMessageCopy() {
  if ($.contextMenuMsgIdx == null || $.contextMenuMsgIdx >= $.lastMessages.length) return;
  var text = getMessageDisplayText($.lastMessages[$.contextMenuMsgIdx]);
  closeMessageContextMenu();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      if (window.toast) window.toast('Copied to clipboard', 'success');
    }).catch(function () {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

export function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (window.toast) window.toast('Copied to clipboard', 'success');
  } catch (e) { }
  document.body.removeChild(ta);
}

export function doMessageForward() {
  if ($.contextMenuMsgIdx == null || $.contextMenuMsgIdx >= $.lastMessages.length) return;
  var text = getMessageDisplayText($.lastMessages[$.contextMenuMsgIdx]);
  closeMessageContextMenu();

  var listEl = document.getElementById('lc-forward-list');
  var modal = document.getElementById('lc-forward-modal');
  if (!listEl || !modal) return;

  var others = $.conversations.filter(function (c) { return c.phone !== $.activePhone; });
  listEl.innerHTML = others.map(function (c) {
    var initials = (c.pushName || '?').slice(0, 2).toUpperCase();
    return '<button type="button" class="lc-forward-item" data-phone="' + escapeAttr(c.phone) + '">' +
      '<span class="lc-avatar">' + avatarImg(c.phone, initials) + '</span>' +
      '<div><span class="lc-name">' + escapeHtml(c.pushName || formatPhoneForDisplay(c.phone)) + '</span><br><span class="lc-phone">+' + escapeHtml(formatPhoneForDisplay(c.phone)) + '</span></div>' +
      '</button>';
  }).join('');

  if (others.length === 0) {
    listEl.innerHTML = '<div class="lc-sidebar-empty" style="padding:24px;"><p>No other conversations to forward to.</p></div>';
  }

  listEl.onclick = function (e) {
    var btn = e.target.closest('.lc-forward-item');
    if (!btn) return;
    var phone = btn.getAttribute('data-phone');
    if (!phone) return;
    forwardMessageTo(phone, text);
    modal.style.display = 'none';
  };
  modal.style.display = 'flex';
}

export async function forwardMessageTo(phone, text) {
  try {
    var log = $.conversations.find(function (c) { return c.phone === phone; });
    var instanceId = log ? log.instanceId : undefined;
    await api('/conversations/' + encodeURIComponent(phone) + '/send', {
      method: 'POST',
      body: { message: text, instanceId: instanceId }
    });
    if (window.toast) window.toast('Forwarded', 'success');
  } catch (err) {
    var msg = err.message || 'Unknown error';
    if (isWhatsAppDisconnectError(msg)) {
      showReconnectionModal();
    } else {
      alert('Failed to forward: ' + msg);
    }
  }
}

export function closeForwardModal() {
  var modal = document.getElementById('lc-forward-modal');
  if (modal) modal.style.display = 'none';
}

export async function doMessagePin() {
  if (!$.activePhone || $.contextMenuMsgIdx == null) return;
  var msgIdx = $.contextMenuMsgIdx;
  closeMessageContextMenu();
  try {
    var result = await api('/conversations/' + encodeURIComponent($.activePhone) + '/messages/' + msgIdx + '/pin', {
      method: 'POST'
    });
    // Update local metadata cache
    if (!$.messageMetadata) $.messageMetadata = { pinned: [], starred: [] };
    var idxStr = String(msgIdx);
    if (result.pinned) {
      if ($.messageMetadata.pinned.indexOf(idxStr) < 0) $.messageMetadata.pinned.push(idxStr);
    } else {
      $.messageMetadata.pinned = $.messageMetadata.pinned.filter(function (x) { return x !== idxStr; });
    }
    updateMessageIndicators();
    if (window.toast) window.toast(result.pinned ? 'Message pinned' : 'Message unpinned', 'success');
  } catch (err) {
    if (window.toast) window.toast('Pin failed: ' + (err.message || 'error'), 'error');
  }
}

export async function doMessageStar() {
  if (!$.activePhone || $.contextMenuMsgIdx == null) return;
  var msgIdx = $.contextMenuMsgIdx;
  closeMessageContextMenu();
  try {
    var result = await api('/conversations/' + encodeURIComponent($.activePhone) + '/messages/' + msgIdx + '/star', {
      method: 'POST'
    });
    // Update local metadata cache
    if (!$.messageMetadata) $.messageMetadata = { pinned: [], starred: [] };
    var idxStr = String(msgIdx);
    if (result.starred) {
      if ($.messageMetadata.starred.indexOf(idxStr) < 0) $.messageMetadata.starred.push(idxStr);
    } else {
      $.messageMetadata.starred = $.messageMetadata.starred.filter(function (x) { return x !== idxStr; });
    }
    updateMessageIndicators();
    if (window.toast) window.toast(result.starred ? 'Message starred' : 'Message unstarred', 'success');
  } catch (err) {
    if (window.toast) window.toast('Star failed: ' + (err.message || 'error'), 'error');
  }
}

export async function doMessageReaction(emoji) {
  if ($.contextMenuMsgIdx == null || !$.activePhone) return;
  var msgIdx = $.contextMenuMsgIdx;
  closeMessageContextMenu();
  try {
    var log = $.conversations.find(function (c) { return c.phone === $.activePhone; });
    var instanceId = log ? log.instanceId : undefined;
    await api('/conversations/' + encodeURIComponent($.activePhone) + '/messages/' + msgIdx + '/react', {
      method: 'POST',
      body: { emoji: emoji, instanceId: instanceId }
    });
    if (window.toast) window.toast('Reaction sent: ' + emoji, 'success');
  } catch (err) {
    if (window.toast) window.toast('Reaction failed: ' + (err.message || 'error'), 'error');
  }
}

// Load message metadata (pinned/starred) for current conversation
export async function loadMessageMetadata() {
  if (!$.activePhone) return;
  try {
    $.messageMetadata = await api('/conversations/' + encodeURIComponent($.activePhone) + '/message-metadata');
  } catch (e) {
    $.messageMetadata = { pinned: [], starred: [] };
  }
}

// Update pin/star indicators on rendered messages
export function updateMessageIndicators() {
  if (!$.messageMetadata) return;
  var container = document.getElementById('lc-messages');
  if (!container) return;

  var bubbles = container.querySelectorAll('.lc-bubble-wrap');
  for (var i = 0; i < bubbles.length; i++) {
    var wrap = bubbles[i];
    var idx = wrap.getAttribute('data-msg-idx');
    if (idx === null) continue;

    var bubble = wrap.querySelector('.lc-bubble');
    if (!bubble) continue;

    // Remove existing indicators
    var existingPin = bubble.querySelector('.lc-msg-pin-icon');
    if (existingPin) existingPin.remove();
    var existingStar = bubble.querySelector('.lc-msg-star-icon');
    if (existingStar) existingStar.remove();

    var metaEl = bubble.querySelector('.lc-bubble-meta');
    if (!metaEl) continue;

    var isPinned = $.messageMetadata.pinned && $.messageMetadata.pinned.indexOf(idx) >= 0;
    var isStarred = $.messageMetadata.starred && $.messageMetadata.starred.indexOf(idx) >= 0;

    if (isPinned) {
      var pinIcon = document.createElement('span');
      pinIcon.className = 'lc-msg-pin-icon';
      pinIcon.title = 'Pinned';
      pinIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4v6l-2 4h10l-2-4V4"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="8" y1="4" x2="16" y2="4"/></svg>';
      metaEl.insertBefore(pinIcon, metaEl.firstChild);
    }

    if (isStarred) {
      var starIcon = document.createElement('span');
      starIcon.className = 'lc-msg-star-icon';
      starIcon.title = 'Starred';
      starIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
      metaEl.insertBefore(starIcon, metaEl.firstChild);
    }
  }
}

export function bindContextMenuActions() {
  var menu = document.getElementById('lc-msg-context-menu');
  if (!menu) return;
  menu.querySelectorAll('.lc-msg-action').forEach(function (btn) {
    var action = btn.getAttribute('data-action');
    var emoji = btn.getAttribute('data-emoji');
    btn.onclick = function () {
      if (action === 'emoji' && emoji) doMessageReaction(emoji);
      else if (action === 'reply') doMessageReply();
      else if (action === 'copy') doMessageCopy();
      else if (action === 'forward') doMessageForward();
      else if (action === 'pin') doMessagePin();
      else if (action === 'star') doMessageStar();
    };
  });
}

// ─── Voice Message Recording (US-074) ────────────────────────

var _voiceState = {
  recording: false,
  mediaRecorder: null,
  chunks: [],
  stream: null,
  startTime: 0,
  timerInterval: null
};

export function toggleVoiceRecording() {
  if (_voiceState.recording) {
    stopVoiceRecording(true); // true = send
  } else {
    startVoiceRecording();
  }
}

async function startVoiceRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (window.toast) window.toast('Microphone not available in this browser', 'error');
    return;
  }

  try {
    var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _voiceState.stream = stream;
    _voiceState.chunks = [];

    // Prefer webm, fall back to ogg
    var mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/ogg;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = ''; // Let browser decide
      }
    }

    var options = mimeType ? { mimeType: mimeType } : {};
    var recorder = new MediaRecorder(stream, options);
    _voiceState.mediaRecorder = recorder;

    recorder.ondataavailable = function (e) {
      if (e.data && e.data.size > 0) {
        _voiceState.chunks.push(e.data);
      }
    };

    recorder.onstop = function () {
      // Handled by stopVoiceRecording
    };

    recorder.start();
    _voiceState.recording = true;
    _voiceState.startTime = Date.now();

    // Update UI
    var micBtn = document.getElementById('lc-mic-btn');
    if (micBtn) micBtn.classList.add('recording');
    var inputBox = document.getElementById('lc-input-box');
    if (inputBox) inputBox.style.display = 'none';
    var helpBtn = document.getElementById('lc-help-me-btn');
    if (helpBtn) helpBtn.style.display = 'none';
    var attachWrap = document.querySelector('.lc-attach-wrap');
    if (attachWrap) attachWrap.style.display = 'none';
    var indicator = document.getElementById('lc-voice-recording');
    if (indicator) indicator.style.display = 'flex';

    // Start timer
    updateVoiceTimer();
    _voiceState.timerInterval = setInterval(updateVoiceTimer, 1000);
  } catch (err) {
    console.error('[Voice] Mic access denied:', err);
    if (window.toast) window.toast('Microphone access denied. Please allow mic access.', 'error');
  }
}

function updateVoiceTimer() {
  var elapsed = Math.floor((Date.now() - _voiceState.startTime) / 1000);
  var mins = Math.floor(elapsed / 60);
  var secs = elapsed % 60;
  var timerEl = document.getElementById('lc-voice-timer');
  if (timerEl) timerEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function stopVoiceRecording(shouldSend) {
  if (!_voiceState.mediaRecorder) return;

  clearInterval(_voiceState.timerInterval);

  if (shouldSend) {
    // Wait for onstop to fire and data to be available
    _voiceState.mediaRecorder.onstop = function () {
      if (_voiceState.chunks.length > 0) {
        var mimeType = _voiceState.mediaRecorder.mimeType || 'audio/webm';
        var ext = mimeType.indexOf('ogg') >= 0 ? 'ogg' : 'webm';
        var blob = new Blob(_voiceState.chunks, { type: mimeType });
        var file = new File([blob], 'voice-message.' + ext, { type: mimeType });
        sendVoiceFile(file);
      }
      cleanupVoiceState();
    };
  } else {
    _voiceState.mediaRecorder.onstop = function () {
      cleanupVoiceState();
    };
  }

  _voiceState.mediaRecorder.stop();

  // Stop all tracks
  if (_voiceState.stream) {
    _voiceState.stream.getTracks().forEach(function (t) { t.stop(); });
  }
}

export function cancelVoiceRecording() {
  stopVoiceRecording(false);
  if (window.toast) window.toast('Recording cancelled', 'info');
}

function cleanupVoiceState() {
  _voiceState.recording = false;
  _voiceState.mediaRecorder = null;
  _voiceState.chunks = [];
  _voiceState.stream = null;

  // Restore UI
  var micBtn = document.getElementById('lc-mic-btn');
  if (micBtn) micBtn.classList.remove('recording');
  var inputBox = document.getElementById('lc-input-box');
  if (inputBox) inputBox.style.display = '';
  var attachWrap = document.querySelector('.lc-attach-wrap');
  if (attachWrap) attachWrap.style.display = '';
  var indicator = document.getElementById('lc-voice-recording');
  if (indicator) indicator.style.display = 'none';
  var timerEl = document.getElementById('lc-voice-timer');
  if (timerEl) timerEl.textContent = '0:00';
}

async function sendVoiceFile(file) {
  if (!$.activePhone) return;

  var btn = document.getElementById('lc-send-btn');
  if (btn) btn.disabled = true;

  var log = $.conversations.find(function (c) { return c.phone === $.activePhone; });
  var instanceId = log ? log.instanceId : '';

  var formData = new FormData();
  formData.append('file', file);
  formData.append('caption', '');
  formData.append('instanceId', instanceId || '');

  try {
    var response = await fetch(API + '/conversations/' + encodeURIComponent($.activePhone) + '/send-media', {
      method: 'POST',
      body: formData
    });
    var data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload failed');
    await refreshChat();
    if (window.toast) window.toast('Voice message sent', 'success');
  } catch (err) {
    if (window.toast) window.toast('Failed to send voice message: ' + (err.message || 'error'), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ─── Input Handlers ──────────────────────────────────────────────

export function autoResize(textarea) {
  textarea.style.height = '42px';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

export function handleKeydown(event) {
  // Workflow palette keyboard nav (US-016)
  var wfPalette = document.getElementById('lc-wf-palette');
  if (wfPalette && wfPalette.style.display !== 'none') {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      workflowPaletteNav(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      workflowPaletteSelect();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      hideWorkflowPalette();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      workflowPaletteSelect();
      return;
    }
  }

  // Command palette keyboard nav
  var palette = document.getElementById('lc-cmd-palette');
  if (palette && palette.style.display !== 'none') {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      cmdPaletteNav(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      cmdPaletteSelect();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      hideCmdPalette();
      return;
    }
    // Tab also selects
    if (event.key === 'Tab') {
      event.preventDefault();
      cmdPaletteSelect();
      return;
    }
  }

  if (event.key !== 'Enter') return;
  if (event.shiftKey) return;

  if ($.translatePreview) {
    event.preventDefault();
    if (event.ctrlKey) {
      sendOriginal();
    } else {
      sendTranslated();
    }
    return;
  }
  event.preventDefault();
  sendReply();
}

// ─── Command Palette (US-015) ─────────────────────────────────

var _cmdTemplates = null; // cached from API
var _cmdHighlight = -1;   // currently highlighted index

export async function loadCmdTemplates() {
  try {
    _cmdTemplates = null;
    var data = await api('/custom-messages');
    if (data && Array.isArray(data.templates)) {
      _cmdTemplates = data.templates;
    }
  } catch (e) {
    console.error('[CmdPalette] Failed to load templates:', e);
    _cmdTemplates = [];
  }
}

export function onInputCmd(textarea) {
  var val = textarea.value;
  // Show workflow palette when input starts with //
  if (val.charAt(0) === '/' && val.charAt(1) === '/') {
    hideCmdPalette();
    showWorkflowPalette(val.slice(2));
  // Show template palette when input starts with / (but not //)
  } else if (val.charAt(0) === '/' && val.charAt(1) !== '/') {
    hideWorkflowPalette();
    showCmdPalette(val.slice(1));
  } else {
    hideCmdPalette();
    hideWorkflowPalette();
  }
}

export function showCmdPalette(filter) {
  if (!_cmdTemplates) {
    // Templates not loaded yet — load and retry
    loadCmdTemplates().then(function () { showCmdPalette(filter); });
    return;
  }

  var palette = document.getElementById('lc-cmd-palette');
  if (!palette) return;

  var filterLower = (filter || '').toLowerCase().trim();
  var matches = _cmdTemplates.filter(function (t) {
    if (!filterLower) return true;
    return t.name.toLowerCase().indexOf(filterLower) >= 0 ||
           t.content.toLowerCase().indexOf(filterLower) >= 0 ||
           (t.category && t.category.toLowerCase().indexOf(filterLower) >= 0);
  });

  if (matches.length === 0) {
    palette.style.display = 'none';
    return;
  }

  // Limit to 10 visible items
  var visible = matches.slice(0, 10);

  var html = '<div class="lc-cmd-header">' +
    '<span class="lc-cmd-title">/ Message Templates</span>' +
    '<span class="lc-cmd-count">' + matches.length + ' template' + (matches.length !== 1 ? 's' : '') + '</span>' +
    '</div>';
  html += '<div class="lc-cmd-list">';
  for (var i = 0; i < visible.length; i++) {
    var t = visible[i];
    var preview = t.content.length > 80 ? t.content.substring(0, 77) + '...' : t.content;
    // Clean markdown bold/italic for preview
    preview = preview.replace(/\*/g, '').replace(/\n/g, ' ');
    var catLabel = t.source === 'builtin' ? 'Static Reply' : (t.category || 'Custom');
    html += '<div class="lc-cmd-item' + (i === 0 ? ' lc-cmd-active' : '') + '" data-cmd-idx="' + i + '" onclick="lcCmdPaletteClick(' + i + ')">' +
      '<div class="lc-cmd-item-name">' +
        '<span class="lc-cmd-slash">/</span>' + escapeHtml(t.name) +
        '<span class="lc-cmd-cat">' + escapeHtml(catLabel) + '</span>' +
      '</div>' +
      '<div class="lc-cmd-item-preview">' + escapeHtml(preview) + '</div>' +
    '</div>';
  }
  html += '</div>';

  // Add "Add new template" button at bottom
  html += '<div class="lc-cmd-footer" onclick="lcCmdAddTemplate()">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
    ' Add custom template' +
  '</div>';

  palette.innerHTML = html;
  palette.style.display = '';
  _cmdHighlight = 0;
  palette._matches = visible;
}

export function hideCmdPalette() {
  var palette = document.getElementById('lc-cmd-palette');
  if (palette) palette.style.display = 'none';
  _cmdHighlight = -1;
}

function cmdPaletteNav(direction) {
  var palette = document.getElementById('lc-cmd-palette');
  if (!palette || !palette._matches) return;
  var items = palette.querySelectorAll('.lc-cmd-item');
  if (items.length === 0) return;

  // Remove current highlight
  if (_cmdHighlight >= 0 && _cmdHighlight < items.length) {
    items[_cmdHighlight].classList.remove('lc-cmd-active');
  }

  _cmdHighlight += direction;
  if (_cmdHighlight < 0) _cmdHighlight = items.length - 1;
  if (_cmdHighlight >= items.length) _cmdHighlight = 0;

  items[_cmdHighlight].classList.add('lc-cmd-active');
  items[_cmdHighlight].scrollIntoView({ block: 'nearest' });
}

function cmdPaletteSelect() {
  var palette = document.getElementById('lc-cmd-palette');
  if (!palette || !palette._matches || _cmdHighlight < 0) return;
  var entry = palette._matches[_cmdHighlight];
  if (!entry) return;
  insertTemplate(entry.content);
}

export function cmdPaletteClick(idx) {
  var palette = document.getElementById('lc-cmd-palette');
  if (!palette || !palette._matches) return;
  var entry = palette._matches[idx];
  if (!entry) return;
  insertTemplate(entry.content);
}

function insertTemplate(content) {
  var input = document.getElementById('lc-input-box');
  if (!input) return;
  input.value = content;
  autoResize(input);
  hideCmdPalette();
  input.focus();
  // Place cursor at end
  input.setSelectionRange(input.value.length, input.value.length);
}

export function cmdAddTemplate() {
  hideCmdPalette();
  var input = document.getElementById('lc-input-box');
  if (input) {
    input.value = '';
    autoResize(input);
  }

  // Simple prompt-based UI for adding templates
  var name = prompt('Template name (short, e.g. "welcome"):');
  if (!name || !name.trim()) return;
  var content = prompt('Template message content:');
  if (!content || !content.trim()) return;

  api('/custom-messages', {
    method: 'POST',
    body: { name: name.trim(), content: content.trim() }
  }).then(function () {
    if (window.toast) window.toast('Template "' + name.trim() + '" saved', 'success');
    // Refresh cache
    loadCmdTemplates();
  }).catch(function (err) {
    if (window.toast) window.toast('Failed to save template: ' + (err.message || 'error'), 'error');
  });
}

// ─── Workflow Palette (US-016: // command) ────────────────────────

var _wfList = null;        // cached workflow list
var _wfHighlight = -1;     // currently highlighted index
var _wfTriggerPending = false; // prevent double-triggers

export async function loadWorkflows() {
  try {
    _wfList = null;
    var data = await api('/workflows');
    if (data && Array.isArray(data.workflows)) {
      _wfList = data.workflows;
    }
  } catch (e) {
    console.error('[WfPalette] Failed to load workflows:', e);
    _wfList = [];
  }
}

export function showWorkflowPalette(filter) {
  if (!_wfList) {
    loadWorkflows().then(function () { showWorkflowPalette(filter); });
    return;
  }

  var palette = document.getElementById('lc-wf-palette');
  if (!palette) return;

  var filterLower = (filter || '').toLowerCase().trim();
  var matches = _wfList.filter(function (w) {
    if (!filterLower) return true;
    return w.name.toLowerCase().indexOf(filterLower) >= 0 ||
           w.id.toLowerCase().indexOf(filterLower) >= 0;
  });

  if (matches.length === 0) {
    palette.style.display = 'none';
    return;
  }

  var visible = matches.slice(0, 10);
  var escapeHtml = window.escapeHtml || function (s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };

  var html = '<div class="lc-wf-header">' +
    '<span class="lc-wf-title">// Workflows</span>' +
    '<span class="lc-wf-count">' + matches.length + ' workflow' + (matches.length !== 1 ? 's' : '') + '</span>' +
    '</div>';
  html += '<div class="lc-wf-list">';
  for (var i = 0; i < visible.length; i++) {
    var w = visible[i];
    var stepCount = (w.steps && w.steps.length) || 0;
    var stepLabel = stepCount + ' step' + (stepCount !== 1 ? 's' : '');
    html += '<div class="lc-wf-item' + (i === 0 ? ' lc-wf-active' : '') + '" data-wf-idx="' + i + '" onclick="lcWfPaletteClick(' + i + ')">' +
      '<div class="lc-wf-item-name">' +
        '<span class="lc-wf-slash">//</span>' + escapeHtml(w.name) +
        '<span class="lc-wf-steps">' + stepLabel + '</span>' +
      '</div>' +
      '<div class="lc-wf-item-id">' + escapeHtml(w.id) + '</div>' +
    '</div>';
  }
  html += '</div>';

  palette.innerHTML = html;
  palette.style.display = '';
  _wfHighlight = 0;
  palette._matches = visible;
}

export function hideWorkflowPalette() {
  var palette = document.getElementById('lc-wf-palette');
  if (palette) palette.style.display = 'none';
  _wfHighlight = -1;
}

function workflowPaletteNav(direction) {
  var palette = document.getElementById('lc-wf-palette');
  if (!palette || !palette._matches) return;
  var items = palette.querySelectorAll('.lc-wf-item');
  if (items.length === 0) return;

  if (_wfHighlight >= 0 && _wfHighlight < items.length) {
    items[_wfHighlight].classList.remove('lc-wf-active');
  }
  _wfHighlight += direction;
  if (_wfHighlight < 0) _wfHighlight = items.length - 1;
  if (_wfHighlight >= items.length) _wfHighlight = 0;
  items[_wfHighlight].classList.add('lc-wf-active');
  items[_wfHighlight].scrollIntoView({ block: 'nearest' });
}

function workflowPaletteSelect() {
  var palette = document.getElementById('lc-wf-palette');
  if (!palette || !palette._matches || _wfHighlight < 0) return;
  var entry = palette._matches[_wfHighlight];
  if (!entry) return;
  triggerWorkflow(entry);
}

export function wfPaletteClick(idx) {
  var palette = document.getElementById('lc-wf-palette');
  if (!palette || !palette._matches) return;
  var entry = palette._matches[idx];
  if (!entry) return;
  triggerWorkflow(entry);
}

// ─── Scheduled Messages (US-020) ────────────────────────────────

export function toggleSchedulePopover() {
  var pop = document.getElementById('lc-schedule-popover');
  if (!pop) return;
  if (pop.style.display !== 'none') {
    pop.style.display = 'none';
    return;
  }
  // Default to 1 hour from now, rounded to nearest 15 minutes
  var now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  var dtInput = document.getElementById('lc-schedule-datetime');
  if (dtInput) {
    // Format as YYYY-MM-DDTHH:mm for datetime-local
    var y = now.getFullYear();
    var mo = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    var h = String(now.getHours()).padStart(2, '0');
    var mi = String(now.getMinutes()).padStart(2, '0');
    dtInput.value = y + '-' + mo + '-' + d + 'T' + h + ':' + mi;
    // Set min to current time
    var nowMin = new Date();
    var ny = nowMin.getFullYear();
    var nmo = String(nowMin.getMonth() + 1).padStart(2, '0');
    var nd = String(nowMin.getDate()).padStart(2, '0');
    var nh = String(nowMin.getHours()).padStart(2, '0');
    var nmi = String(nowMin.getMinutes()).padStart(2, '0');
    dtInput.min = ny + '-' + nmo + '-' + nd + 'T' + nh + ':' + nmi;
  }
  // Reset repeat fields (US-021)
  var repeatSel = document.getElementById('lc-schedule-repeat');
  if (repeatSel) repeatSel.value = 'none';
  var endWrap = document.getElementById('lc-schedule-end-wrap');
  if (endWrap) endWrap.style.display = 'none';
  var endDate = document.getElementById('lc-schedule-end-date');
  if (endDate) endDate.value = '';

  pop.style.display = 'block';
}

// US-008: Update schedule preview text
export function updateSchedulePreview() {
  var dateEl = document.getElementById('lc-schedule-date');
  var hhEl = document.getElementById('lc-schedule-hh');
  var mmEl = document.getElementById('lc-schedule-mm');
  var preview = document.getElementById('lc-schedule-preview');
  if (!preview) return;
  if (!dateEl || !dateEl.value) { preview.textContent = ''; return; }
  var hh = String(parseInt(hhEl && hhEl.value !== '' ? hhEl.value : '0', 10) || 0).padStart(2, '0');
  var mm = String(parseInt(mmEl && mmEl.value !== '' ? mmEl.value : '0', 10) || 0).padStart(2, '0');
  try {
    var dt = new Date(dateEl.value + 'T' + hh + ':' + mm + ':00');
    if (isNaN(dt.getTime())) { preview.textContent = ''; return; }
    var opts = { day: 'numeric', month: 'short', year: 'numeric' };
    var dateStr = dt.toLocaleDateString('en-GB', opts);
    preview.textContent = 'Will send: ' + dateStr + ' at ' + hh + ':' + mm + ':00';
  } catch (e) { preview.textContent = ''; }
}

// US-014: Toggle date-jump popover in message search bar
export function toggleDateJump() {
  var pop = document.getElementById('lc-date-jump-popover');
  if (!pop) return;
  var isOpen = pop.style.display !== 'none';
  pop.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    var inp = document.getElementById('lc-date-jump-input');
    if (inp) inp.focus();
    setTimeout(function () {
      function onOutside(e) {
        var wrap = document.querySelector('.lc-msg-search-date-wrap');
        if (wrap && !wrap.contains(e.target)) {
          pop.style.display = 'none';
          document.removeEventListener('click', onOutside);
        }
      }
      document.addEventListener('click', onOutside);
    }, 0);
  }
}

// US-014: Scroll to the first message on a given date
export function jumpToDate(dateStr) {
  var pop = document.getElementById('lc-date-jump-popover');
  if (pop) pop.style.display = 'none';
  if (!dateStr) return;
  var target = new Date(dateStr + 'T00:00:00');
  var messages = document.querySelectorAll('#lc-messages [data-ts]');
  var found = null;
  for (var i = 0; i < messages.length; i++) {
    var ts = parseInt(messages[i].getAttribute('data-ts'), 10);
    if (!ts) continue;
    var msgDate = new Date(ts < 1e12 ? ts * 1000 : ts);
    if (msgDate >= target) { found = messages[i]; break; }
  }
  // Fallback: try date separator elements
  if (!found) {
    var seps = document.querySelectorAll('#lc-messages .lc-date-sep');
    for (var j = 0; j < seps.length; j++) {
      var sepText = seps[j].textContent || '';
      var sepDate = new Date(sepText);
      if (!isNaN(sepDate.getTime()) && sepDate >= target) { found = seps[j]; break; }
    }
  }
  var dateOpts = { day: 'numeric', month: 'short', year: 'numeric' };
  var displayDate = target.toLocaleDateString('en-GB', dateOpts);
  if (!found) {
    if (window.toast) window.toast('No messages found for ' + displayDate, 'info');
    return;
  }
  found.scrollIntoView({ behavior: 'smooth', block: 'start' });
  found.classList.add('lc-date-jump-highlight');
  setTimeout(function () { found.classList.remove('lc-date-jump-highlight'); }, 2000);
}

// US-021: Show/hide end date field based on repeat selection
export function toggleRepeatEndDate() {
  var repeatSel = document.getElementById('lc-schedule-repeat');
  var endWrap = document.getElementById('lc-schedule-end-wrap');
  if (!repeatSel || !endWrap) return;
  endWrap.style.display = repeatSel.value !== 'none' ? '' : 'none';
}

export function hideSchedulePopover() {
  var pop = document.getElementById('lc-schedule-popover');
  if (pop) pop.style.display = 'none';
}

export async function confirmSchedule() {
  if (!$.activePhone) {
    if (window.toast) window.toast('Select a conversation first', 'error');
    return;
  }
  var input = document.getElementById('lc-input-box');
  var content = input ? input.value.trim() : '';
  if (!content) {
    if (window.toast) window.toast('Type a message to schedule', 'error');
    return;
  }
  // US-008: Read from separate date/time fields
  var dateEl = document.getElementById('lc-schedule-date');
  var hhEl = document.getElementById('lc-schedule-hh');
  var mmEl = document.getElementById('lc-schedule-mm');
  var ssEl = document.getElementById('lc-schedule-ss');
  if (!dateEl || !dateEl.value) {
    if (window.toast) window.toast('Pick a date and time', 'error');
    return;
  }
  var hh = String(parseInt(hhEl && hhEl.value !== '' ? hhEl.value : '0', 10) || 0).padStart(2, '0');
  var mm = String(parseInt(mmEl && mmEl.value !== '' ? mmEl.value : '0', 10) || 0).padStart(2, '0');
  var ss = String(parseInt(ssEl && ssEl.value !== '' ? ssEl.value : '0', 10) || 0).padStart(2, '0');
  var scheduledAt = dateEl.value + 'T' + hh + ':' + mm + ':' + ss;
  var dt = new Date(scheduledAt);
  if (isNaN(dt.getTime()) || dt <= new Date()) {
    if (window.toast) window.toast('Pick a future date and time', 'error');
    return;
  }

  // US-021: Get repeat settings
  var repeatSel = document.getElementById('lc-schedule-repeat');
  var repeatFrequency = (repeatSel && repeatSel.value !== 'none') ? repeatSel.value : undefined;
  var endDateInput = document.getElementById('lc-schedule-end-date');
  var repeatEndDate = (endDateInput && endDateInput.value) ? endDateInput.value : undefined;

  try {
    var body = {
      phone: $.activePhone,
      content: content,
      scheduledAt: dt.toISOString(),
      createdBy: $.staffName || 'Staff'
    };
    if (repeatFrequency) body.repeatFrequency = repeatFrequency;
    if (repeatEndDate) body.repeatEndDate = repeatEndDate;

    await api('/scheduled-messages', {
      method: 'POST',
      body: body
    });
    // Clear input and hide popover
    if (input) {
      input.value = '';
      autoResize(input);
    }
    hideSchedulePopover();
    if (window.toast) window.toast('Message scheduled for ' + dt.toLocaleString(), 'success');
    updateScheduledBadge();
  } catch (err) {
    if (window.toast) window.toast('Failed to schedule: ' + (err.message || 'error'), 'error');
  }
}

export async function showScheduledPanel() {
  // Close header menu
  var dropdown = document.getElementById('lc-header-dropdown');
  if (dropdown) dropdown.classList.remove('open');
  var btn = document.getElementById('lc-header-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');

  var panel = document.getElementById('lc-scheduled-panel');
  if (!panel) return;
  panel.style.display = 'flex';

  var list = document.getElementById('lc-scheduled-list');
  if (!list) return;
  list.innerHTML = '<div class="lc-scheduled-empty">Loading...</div>';

  try {
    var result = await api('/scheduled-messages');
    var messages = result.messages || [];
    if (messages.length === 0) {
      list.innerHTML = '<div class="lc-scheduled-empty">No scheduled messages</div>';
      return;
    }
    // Sort: pending first, then by scheduledAt ascending
    messages.sort(function (a, b) {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });

    var html = '';
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      var dt = new Date(m.scheduledAt);
      var dateStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var statusClass = m.status === 'pending' ? 'lc-sched-pending' : (m.status === 'sent' ? 'lc-sched-sent' : 'lc-sched-cancelled');
      var statusLabel = m.status.charAt(0).toUpperCase() + m.status.slice(1);
      var phone = m.phone.replace(/^\d{1,3}/, function (cc) { return '+' + cc + ' '; });
      var preview = m.content.length > 80 ? m.content.substring(0, 80) + '...' : m.content;
      var repeatLabel = '';
      if (m.repeatFrequency && m.repeatFrequency !== 'none') {
        repeatLabel = ' <span class="lc-sched-repeat">' + m.repeatFrequency + '</span>';
      }

      html += '<div class="lc-sched-item ' + statusClass + '">';
      html += '<div class="lc-sched-item-top">';
      html += '<span class="lc-sched-phone">' + phone + '</span>';
      html += '<span class="lc-sched-status">' + statusLabel + '</span>' + repeatLabel;
      html += '</div>';
      html += '<div class="lc-sched-item-msg">' + preview.replace(/</g, '&lt;') + '</div>';
      html += '<div class="lc-sched-item-bottom">';
      html += '<span class="lc-sched-time">' + dateStr + '</span>';
      if (m.status === 'pending') {
        html += '<span class="lc-sched-item-actions">';
        html += '<button class="lc-sched-edit-btn" onclick="lcEditScheduled(\'' + m.id + '\')" title="Edit">Edit</button>';
        html += '<button class="lc-sched-cancel-btn" onclick="lcCancelScheduled(\'' + m.id + '\')" title="Cancel">Cancel</button>';
        html += '</span>';
      }
      if (m.status === 'sent' && m.sentAt) {
        html += '<span class="lc-sched-sent-at">Sent ' + new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span>';
      }
      html += '</div>';
      html += '</div>';
    }
    list.innerHTML = html;
  } catch (err) {
    list.innerHTML = '<div class="lc-scheduled-empty">Failed to load: ' + (err.message || 'error') + '</div>';
  }
}

export function closeScheduledPanel() {
  var panel = document.getElementById('lc-scheduled-panel');
  if (panel) panel.style.display = 'none';
}

export async function cancelScheduled(id) {
  if (!confirm('Cancel this scheduled message?')) return;
  try {
    await api('/scheduled-messages/' + encodeURIComponent(id), { method: 'DELETE' });
    if (window.toast) window.toast('Scheduled message cancelled', 'success');
    showScheduledPanel(); // Refresh list
    updateScheduledBadge();
  } catch (err) {
    if (window.toast) window.toast('Failed to cancel: ' + (err.message || 'error'), 'error');
  }
}

export async function editScheduled(id) {
  // Fetch the message details
  try {
    var msg = await api('/scheduled-messages/' + encodeURIComponent(id));
    if (!msg) return;

    var newContent = prompt('Edit message content:', msg.content);
    if (newContent === null) return; // User cancelled
    if (!newContent.trim()) {
      if (window.toast) window.toast('Message cannot be empty', 'error');
      return;
    }

    var newTime = prompt('Edit scheduled time (YYYY-MM-DD HH:mm):', new Date(msg.scheduledAt).toLocaleString());
    // If user cancels time edit, keep original
    var updates = { content: newContent.trim() };
    if (newTime !== null && newTime.trim()) {
      var parsed = new Date(newTime.trim());
      if (!isNaN(parsed.getTime()) && parsed > new Date()) {
        updates.scheduledAt = parsed.toISOString();
      }
    }

    await api('/scheduled-messages/' + encodeURIComponent(id), {
      method: 'PUT',
      body: updates
    });
    if (window.toast) window.toast('Scheduled message updated', 'success');
    showScheduledPanel(); // Refresh list
  } catch (err) {
    if (window.toast) window.toast('Failed to edit: ' + (err.message || 'error'), 'error');
  }
}

export async function updateScheduledBadge() {
  try {
    var result = await api('/scheduled-messages?status=pending');
    var count = (result.messages || []).length;
    var badge = document.getElementById('lc-sched-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = String(count);
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch {
    // Silently ignore — badge is non-critical
  }
}

function triggerWorkflow(workflow) {
  if (_wfTriggerPending) return;
  if (!$.activePhone) {
    if (window.toast) window.toast('Select a conversation first', 'error');
    return;
  }

  // Clear input and hide palette
  var input = document.getElementById('lc-input-box');
  if (input) {
    input.value = '';
    autoResize(input);
  }
  hideWorkflowPalette();

  _wfTriggerPending = true;
  if (window.toast) window.toast('Starting workflow: ' + workflow.name + '...', 'info');

  api('/conversations/' + encodeURIComponent($.activePhone) + '/trigger-workflow', {
    method: 'POST',
    body: {
      workflowId: workflow.id,
      staffName: $.staffName || 'Staff'
    }
  }).then(function (result) {
    _wfTriggerPending = false;
    if (window.toast) window.toast('Workflow "' + workflow.name + '" started', 'success');
    // Refresh chat to show the workflow message
    refreshChat();
  }).catch(function (err) {
    _wfTriggerPending = false;
    if (window.toast) window.toast('Failed to trigger workflow: ' + (err.message || 'error'), 'error');
  });
}

// ─── WhatsApp Reconnection Modal ──────────────────────────────────

var _reconnectPollTimer = null;

function isWhatsAppDisconnectError(msg) {
  var lower = msg.toLowerCase();
  return lower.indexOf('no whatsapp') >= 0 || lower.indexOf('instances connected') >= 0 || lower.indexOf('instance connected') >= 0;
}

export async function showReconnectionModal() {
  // Remove existing modal if any
  var existing = document.getElementById('lc-reconnect-modal');
  if (existing) existing.remove();
  clearInterval(_reconnectPollTimer);

  var overlay = document.createElement('div');
  overlay.id = 'lc-reconnect-modal';
  overlay.className = 'lc-modal-overlay';
  overlay.onclick = function (e) { if (e.target === overlay) closeReconnectionModal(); };

  var content = document.createElement('div');
  content.className = 'lc-modal-content lc-reconnect-modal';

  var header = document.createElement('div');
  header.className = 'lc-modal-title';
  header.textContent = 'WhatsApp Disconnected';

  var desc = document.createElement('p');
  desc.className = 'lc-reconnect-desc';
  desc.textContent = 'No WhatsApp connection available. Reconnect an existing number or add a new one.';

  var instancesWrap = document.createElement('div');
  instancesWrap.className = 'lc-reconnect-instances';
  instancesWrap.id = 'lc-reconnect-instances';
  instancesWrap.innerHTML = '<div class="lc-reconnect-loading">Loading instances...</div>';

  var qrWrap = document.createElement('div');
  qrWrap.className = 'lc-reconnect-qr-wrap';
  qrWrap.id = 'lc-reconnect-qr-wrap';
  qrWrap.style.display = 'none';
  qrWrap.innerHTML =
    '<div class="lc-reconnect-qr-label" id="lc-reconnect-qr-label">Scan QR code with WhatsApp</div>' +
    '<div class="lc-reconnect-qr" id="lc-reconnect-qr"></div>' +
    '<div class="lc-reconnect-qr-status" id="lc-reconnect-qr-status">Waiting for scan...</div>';

  var buttons = document.createElement('div');
  buttons.className = 'lc-modal-buttons';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'lc-modal-btn lc-modal-btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = function () { closeReconnectionModal(); };

  var addBtn = document.createElement('button');
  addBtn.className = 'lc-modal-btn lc-modal-btn-send';
  addBtn.textContent = '+ Add New Number';
  addBtn.onclick = function () { addNewWhatsApp(); };

  buttons.appendChild(cancelBtn);
  buttons.appendChild(addBtn);

  content.appendChild(header);
  content.appendChild(desc);
  content.appendChild(instancesWrap);
  content.appendChild(qrWrap);
  content.appendChild(buttons);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  loadReconnectInstances();
}

async function loadReconnectInstances() {
  var container = document.getElementById('lc-reconnect-instances');
  if (!container) return;

  try {
    var instances = await api('/whatsapp/instances');
    if (!instances || instances.length === 0) {
      container.innerHTML = '<div class="lc-reconnect-empty">No WhatsApp numbers configured. Click "+ Add New Number" to get started.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      var stateClass = inst.state === 'open' ? 'lc-inst-connected' : (inst.state === 'connecting' ? 'lc-inst-connecting' : 'lc-inst-disconnected');
      var stateLabel = inst.state === 'open' ? 'Connected' : (inst.state === 'connecting' ? 'Connecting...' : 'Disconnected');
      var phone = (inst.user && inst.user.phone) ? '+' + inst.user.phone : '';
      var actionBtn = inst.state !== 'open'
        ? '<button class="lc-reconnect-btn" onclick="lcReconnectInstance(\'' + escapeAttr(inst.id) + '\')">Reconnect</button>'
        : '<span class="lc-reconnect-ok">Connected</span>';

      html += '<div class="lc-reconnect-item">' +
        '<div class="lc-reconnect-item-info">' +
          '<span class="lc-reconnect-item-label">' + escapeHtml(inst.label || inst.id) + '</span>' +
          (phone ? '<span class="lc-reconnect-item-phone">' + escapeHtml(phone) + '</span>' : '') +
        '</div>' +
        '<div class="lc-reconnect-item-right">' +
          '<span class="lc-reconnect-state ' + stateClass + '">' + stateLabel + '</span>' +
          actionBtn +
        '</div>' +
      '</div>';
    }
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<div class="lc-reconnect-empty">Failed to load: ' + escapeHtml(err.message || 'error') + '</div>';
  }
}

export async function reconnectInstance(instanceId) {
  var qrWrap = document.getElementById('lc-reconnect-qr-wrap');
  var qrEl = document.getElementById('lc-reconnect-qr');
  var qrLabel = document.getElementById('lc-reconnect-qr-label');
  var qrStatus = document.getElementById('lc-reconnect-qr-status');
  if (!qrWrap || !qrEl) return;

  qrWrap.style.display = '';
  qrEl.innerHTML = '<div class="lc-reconnect-loading">Loading QR code...</div>';
  if (qrStatus) qrStatus.textContent = 'Waiting for QR code...';
  if (qrLabel) qrLabel.textContent = 'Scan QR code for "' + instanceId + '"';

  clearInterval(_reconnectPollTimer);
  _reconnectPollTimer = setInterval(function () { pollQR(instanceId); }, 3000);
  pollQR(instanceId);
}

async function pollQR(instanceId) {
  try {
    var data = await api('/whatsapp/instances/' + encodeURIComponent(instanceId) + '/qr');
    var qrEl = document.getElementById('lc-reconnect-qr');
    var qrStatus = document.getElementById('lc-reconnect-qr-status');

    if (!qrEl) { clearInterval(_reconnectPollTimer); return; }

    if (data.state === 'open') {
      clearInterval(_reconnectPollTimer);
      qrEl.innerHTML = '<div class="lc-reconnect-success">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#25d366" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>' +
        '<span>Connected!</span></div>';
      if (qrStatus) qrStatus.textContent = 'WhatsApp connected successfully.';
      if (window.toast) window.toast('WhatsApp reconnected!', 'success');
      // Refresh instance list
      loadReconnectInstances();
      setTimeout(closeReconnectionModal, 2000);
      return;
    }

    if (data.qrDataUrl) {
      qrEl.innerHTML = '<img src="' + data.qrDataUrl + '" alt="QR Code" class="lc-reconnect-qr-img">';
      if (qrStatus) qrStatus.textContent = 'Open WhatsApp > Linked Devices > Link a Device';
    } else {
      qrEl.innerHTML = '<div class="lc-reconnect-loading">Generating QR code...</div>';
      if (qrStatus) qrStatus.textContent = 'QR code not yet available, retrying...';
    }
  } catch (err) {
    var qrStatus = document.getElementById('lc-reconnect-qr-status');
    if (qrStatus) qrStatus.textContent = 'Error: ' + (err.message || 'Failed to get QR');
  }
}

export async function addNewWhatsApp() {
  var id = prompt('Enter an ID for this WhatsApp number (e.g. "main" or "reception"):');
  if (!id || !id.trim()) return;
  var label = prompt('Enter a display label (e.g. "Main Line", "Reception"):');
  if (!label || !label.trim()) return;

  try {
    await api('/whatsapp/instances', {
      method: 'POST',
      body: { id: id.trim(), label: label.trim() }
    });
    if (window.toast) window.toast('Instance added! Scan QR to connect.', 'success');
    await loadReconnectInstances();
    reconnectInstance(id.trim());
  } catch (err) {
    alert('Failed to add: ' + (err.message || 'error'));
  }
}

export function closeReconnectionModal() {
  clearInterval(_reconnectPollTimer);
  _reconnectPollTimer = null;
  var modal = document.getElementById('lc-reconnect-modal');
  if (modal) modal.remove();
}
