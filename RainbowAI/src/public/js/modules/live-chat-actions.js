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
      body: { message: message, instanceId: instanceId }
    });

    input.value = '';
    input.style.height = '42px';
    await refreshChat();
  } catch (err) {
    alert('Failed to send message: ' + (err.message || 'Unknown error'));
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
    if (window.toast) window.toast('Failed to share contact: ' + (err.message || 'Unknown error'), 'error');
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
    alert('Failed to send message: ' + (err.message || 'Unknown error'));
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

  var bubbleWrap = document.querySelector('#lc-messages [data-msg-idx="' + idx + '"]');
  if (bubbleWrap) {
    var rect = bubbleWrap.getBoundingClientRect();
    menu.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 260)) + 'px';
    menu.style.top = (rect.bottom + 8) + 'px';
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
    alert('Failed to forward: ' + err.message);
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
