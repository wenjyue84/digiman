// ═══════════════════════════════════════════════════════════════════
// Real Chat Module - WhatsApp conversation management
// ═══════════════════════════════════════════════════════════════════
//
// Features:
// - Real-time WhatsApp conversation logs
// - Multi-instance support with filtering
// - Developer mode (show AI metadata)
// - Translation mode (auto-translate replies)
// - Manual reply interface
// - Auto-refresh every 10 seconds
//
// State Management:
// - Uses StateManager for devMode, translateMode, translateLang (persisted)
// - Module-level variables for runtime state (conversations, activePhone, etc.)
//
// Dependencies: StateManager, Utils (api, escapeHtml, formatDateTime, etc.)
// ═══════════════════════════════════════════════════════════════════

const RealChat = (function() {
  // ─── Private State ────────────────────────────────────────────────

  // Runtime state (not persisted)
  let _rcConversations = [];
  let _rcActivePhone = null;
  let _rcAutoRefresh = null;
  let _rcInstances = {};  // instanceId -> label map
  let _rcPendingTranslation = null;  // Stores pending translation data

  // Persisted state managed by StateManager
  // - StateManager.get/set('realChat.devMode')
  // - StateManager.get/set('realChat.translateMode')
  // - StateManager.get/set('realChat.translateLang')

  // ─── Developer Mode ───────────────────────────────────────────────

  /**
   * Toggle developer mode (shows AI metadata in chat bubbles)
   */
  function toggleDevMode() {
    const currentMode = StateManager.get('realChat.devMode');
    const newMode = !currentMode;
    StateManager.set('realChat.devMode', newMode);

    const btn = document.getElementById('rc-dev-toggle');
    if (newMode) {
      btn.classList.add('active');
      btn.textContent = '🔧 Dev ✓';
    } else {
      btn.classList.remove('active');
      btn.textContent = '🔧 Dev';
    }

    // Re-render current chat to show/hide metadata
    if (_rcActivePhone) refreshActiveChat();
  }

  // ─── Translation Mode ─────────────────────────────────────────────

  /**
   * Toggle translation mode (auto-translate manual replies)
   */
  function toggleTranslateMode() {
    const currentMode = StateManager.get('realChat.translateMode');
    const newMode = !currentMode;
    StateManager.set('realChat.translateMode', newMode);

    const btn = document.getElementById('rc-translate-toggle');
    const selector = document.getElementById('rc-lang-selector');

    if (newMode) {
      btn.classList.add('active');
      btn.textContent = '🌐 Translate ✓';
      selector.style.display = '';
      selector.value = StateManager.get('realChat.translateLang');
    } else {
      btn.classList.remove('active');
      btn.textContent = '🌐 Translate';
      selector.style.display = 'none';
    }
  }

  /**
   * Handle language selector change
   */
  function handleLangChange() {
    const selector = document.getElementById('rc-lang-selector');
    StateManager.set('realChat.translateLang', selector.value);
  }

  // ─── Translation Modal ────────────────────────────────────────────

  /**
   * Show translation confirmation modal
   */
  function showTranslateModal() {
    if (!_rcPendingTranslation) return;

    const modal = document.getElementById('rc-translate-modal');
    const originalEl = document.getElementById('rc-translate-original');
    const translatedEl = document.getElementById('rc-translate-translated');
    const langEl = document.getElementById('rc-translate-lang-name');

    originalEl.textContent = _rcPendingTranslation.original;
    translatedEl.textContent = _rcPendingTranslation.translated;
    langEl.textContent = _rcPendingTranslation.targetLang.toUpperCase();

    modal.style.display = 'flex';
  }

  /**
   * Close translation confirmation modal
   */
  function closeTranslateModal() {
    const modal = document.getElementById('rc-translate-modal');
    modal.style.display = 'none';
    _rcPendingTranslation = null;

    // Re-enable send button
    const btn = document.getElementById('rc-send-btn');
    btn.disabled = false;

    // Focus back to input
    const input = document.getElementById('rc-input-box');
    input.focus();
  }

  /**
   * Confirm and send translated message
   */
  async function confirmTranslation() {
    if (!_rcPendingTranslation || !_rcActivePhone) {
      closeTranslateModal();
      return;
    }

    const modal = document.getElementById('rc-translate-modal');
    const confirmBtn = modal.querySelector('.rc-translate-btn.send');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Sending...';

    try {
      // Get the instanceId from the active conversation
      const log = _rcConversations.find(c => c.phone === _rcActivePhone);
      const instanceId = log?.instanceId;

      // Send the translated message
      await api('/conversations/' + encodeURIComponent(_rcActivePhone) + '/send', {
        method: 'POST',
        body: { message: _rcPendingTranslation.translated, instanceId }
      });

      // Clear input
      const input = document.getElementById('rc-input-box');
      input.value = '';
      input.style.height = '40px';

      // Close modal
      closeTranslateModal();

      // Refresh the chat to show the sent message
      await refreshActiveChat();
    } catch (err) {
      alert('Failed to send translated message: ' + err.message);
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Send';
    }
  }

  // ─── Main Load Function ───────────────────────────────────────────

  /**
   * Load Real Chat tab - fetch conversations and setup auto-refresh
   */
  async function loadRealChat() {
    // Restore developer mode button state
    const devMode = StateManager.get('realChat.devMode');
    const devBtn = document.getElementById('rc-dev-toggle');
    if (devMode) {
      devBtn.classList.add('active');
      devBtn.textContent = '🔧 Dev ✓';
    }

    // Restore translation mode button state
    const translateMode = StateManager.get('realChat.translateMode');
    const translateLang = StateManager.get('realChat.translateLang');
    const translateBtn = document.getElementById('rc-translate-toggle');
    const langSelector = document.getElementById('rc-lang-selector');
    if (translateMode) {
      translateBtn.classList.add('active');
      translateBtn.textContent = '🌐 Translate ✓';
      langSelector.style.display = '';
      langSelector.value = translateLang;
    }

    try {
      // Load conversations and WhatsApp instances in parallel
      const [convos, statusData] = await Promise.all([
        api('/conversations'),
        api('/status')
      ]);
      _rcConversations = convos;

      // Build instance map from WhatsApp instances
      _rcInstances = {};
      if (statusData.whatsappInstances) {
        for (const inst of statusData.whatsappInstances) {
          _rcInstances[inst.id] = inst.label || inst.id;
        }
      }
      buildInstanceFilter();
      renderConversationList(convos);

      // Auto-refresh every 10 seconds while on this tab
      clearInterval(_rcAutoRefresh);
      _rcAutoRefresh = setInterval(async () => {
        if (document.getElementById('tab-real-chat').classList.contains('hidden')) {
          clearInterval(_rcAutoRefresh);
          return;
        }
        try {
          const fresh = await api('/conversations');
          _rcConversations = fresh;
          buildInstanceFilter(); // Rebuild dropdown to keep counts updated
          renderConversationList(_rcConversations); // Use global _rcConversations, not fresh
          if (_rcActivePhone) refreshActiveChat();
        } catch {}
      }, 10000);
    } catch (err) {
      console.error('[RealChat] Failed to load conversations:', err);
    }
  }

  // ─── Instance Filter ──────────────────────────────────────────────

  /**
   * Build instance filter dropdown with conversation counts
   */
  function buildInstanceFilter() {
    const select = document.getElementById('rc-instance-filter');
    // Collect unique instanceIds from conversations + known instances
    const instanceIds = new Set();
    for (const c of _rcConversations) {
      if (c.instanceId) instanceIds.add(c.instanceId);
    }
    for (const id of Object.keys(_rcInstances)) {
      instanceIds.add(id);
    }

    const currentVal = select.value;
    let html = '<option value="">All Instances (' + _rcConversations.length + ')</option>';
    for (const id of instanceIds) {
      const label = _rcInstances[id] || id;
      const count = _rcConversations.filter(c => c.instanceId === id).length;
      html += '<option value="' + escapeHtml(id) + '">' + escapeHtml(label) + ' (' + count + ')</option>';
    }
    // Add "Unknown" option for conversations without instanceId
    const unknownCount = _rcConversations.filter(c => !c.instanceId).length;
    if (unknownCount > 0) {
      html += '<option value="__unknown__">Unknown Instance (' + unknownCount + ')</option>';
    }
    select.innerHTML = html;
    select.value = currentVal;
  }

  // ─── Conversation List ────────────────────────────────────────────

  /**
   * Render conversation list sidebar with filtering
   * @param {Array} conversations - List of conversation objects
   */
  function renderConversationList(conversations) {
    const list = document.getElementById('rc-chat-list');
    const empty = document.getElementById('rc-sidebar-empty');
    if (!conversations.length) {
      empty.style.display = '';
      list.innerHTML = '';
      list.appendChild(empty);
      return;
    }
    empty.style.display = 'none';

    const searchVal = (document.getElementById('rc-search').value || '').toLowerCase();
    const instanceVal = document.getElementById('rc-instance-filter').value;

    console.log('[RealChat Filter] Selected instance:', instanceVal || '(all)');
    console.log('[RealChat Filter] Total conversations:', conversations.length);

    let filtered = conversations;
    // Filter by instance
    if (instanceVal === '__unknown__') {
      filtered = filtered.filter(c => !c.instanceId);
      console.log('[RealChat Filter] Filtered to unknown instances:', filtered.length);
    } else if (instanceVal) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(c => c.instanceId === instanceVal);
      console.log('[RealChat Filter] Filtered by instance "' + instanceVal + '": ' + beforeCount + ' -> ' + filtered.length);
      // Debug: show which instanceIds are present
      const uniqueIds = [...new Set(conversations.map(c => c.instanceId))];
      console.log('[RealChat Filter] Available instanceIds:', uniqueIds);
    }
    // Filter by search text
    if (searchVal) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(c =>
        (c.pushName || '').toLowerCase().includes(searchVal) ||
        c.phone.toLowerCase().includes(searchVal) ||
        (c.lastMessage || '').toLowerCase().includes(searchVal)
      );
      console.log('[RealChat Filter] Filtered by search "' + searchVal + '": ' + beforeCount + ' -> ' + filtered.length);
    }

    if (!filtered.length) {
      list.innerHTML = '<div class="rc-sidebar-empty"><p>No matching conversations.</p></div>';
      return;
    }

    list.innerHTML = filtered.map(c => {
      const initials = (c.pushName || '?').slice(0, 2).toUpperCase();
      const time = formatRelativeTime(c.lastMessageAt);
      const preview = c.lastMessageRole === 'assistant' ? '🤖 ' + c.lastMessage : c.lastMessage;
      const isActive = c.phone === _rcActivePhone ? ' active' : '';
      const instanceLabel = c.instanceId ? (_rcInstances[c.instanceId] || c.instanceId) : '';
      const instanceBadge = instanceLabel ? '<span class="rc-instance-badge">' + escapeHtml(instanceLabel) + '</span>' : '';
      return '<div class="rc-chat-item' + isActive + '" onclick="RealChat.openConversation(\'' + escapeAttr(c.phone) + '\')">' +
        '<div class="rc-avatar">' + initials + '</div>' +
        '<div class="rc-chat-info">' +
          '<div class="rc-chat-name">' + escapeHtml(c.pushName || c.phone) + ' ' + instanceBadge + '</div>' +
          '<div class="rc-chat-preview">' + escapeHtml(preview) + '</div>' +
        '</div>' +
        '<div class="rc-chat-meta">' +
          '<div class="rc-chat-time">' + time + '</div>' +
          '<div class="rc-chat-count">' + c.messageCount + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /**
   * Filter conversations based on search input and instance filter
   */
  function filterConversations() {
    console.log('[RealChat] Filter triggered');
    renderConversationList(_rcConversations);
  }

  // ─── Chat View ────────────────────────────────────────────────────

  /**
   * Open a conversation and load its messages
   * @param {string} phone - Phone number to open
   */
  async function openConversation(phone) {
    _rcActivePhone = phone;
    // Highlight in sidebar
    document.querySelectorAll('.rc-chat-item').forEach(el => el.classList.remove('active'));
    const items = document.querySelectorAll('.rc-chat-item');
    items.forEach(el => { if (el.onclick?.toString().includes(phone)) el.classList.add('active'); });

    try {
      const log = await api('/conversations/' + encodeURIComponent(phone));
      renderChatView(log);
    } catch (err) {
      console.error('[RealChat] Failed to load conversation:', err);
    }
  }

  /**
   * Render chat view with messages
   * @param {Object} log - Conversation log object
   */
  function renderChatView(log) {
    document.getElementById('rc-empty-state').style.display = 'none';
    const chat = document.getElementById('rc-active-chat');
    chat.style.display = 'flex';

    const initials = (log.pushName || '?').slice(0, 2).toUpperCase();
    document.getElementById('rc-active-avatar').textContent = initials;
    document.getElementById('rc-active-name').textContent = log.pushName || 'Unknown';

    // Show phone + instance badge
    const phoneEl = document.getElementById('rc-active-phone');
    const instanceEl = document.getElementById('rc-active-instance');
    phoneEl.firstChild.textContent = log.phone + ' ';
    if (log.instanceId) {
      const label = _rcInstances[log.instanceId] || log.instanceId;
      instanceEl.textContent = label;
      instanceEl.style.display = '';
    } else {
      instanceEl.style.display = 'none';
    }

    // Stats
    const instanceStat = log.instanceId ? ' | Instance: ' + (_rcInstances[log.instanceId] || log.instanceId) : '';
    document.getElementById('rc-stat-total').textContent = log.messages.length + ' messages';
    document.getElementById('rc-stat-started').textContent = 'Started: ' + formatDateTime(log.createdAt);
    document.getElementById('rc-stat-last').textContent = 'Last active: ' + formatRelativeTime(log.updatedAt) + instanceStat;

    // Render messages with date separators
    const container = document.getElementById('rc-messages');
    let html = '';
    let lastDate = '';

    const devMode = StateManager.get('realChat.devMode');

    for (const msg of log.messages) {
      const msgDate = new Date(msg.timestamp).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
      if (msgDate !== lastDate) {
        html += '<div class="rc-date-sep"><span>' + msgDate + '</span></div>';
        lastDate = msgDate;
      }

      const isGuest = msg.role === 'user';
      const side = isGuest ? 'guest' : 'ai';
      const time = new Date(msg.timestamp).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });

      let footer = '<span class="rc-bubble-time">' + time + '</span>';
      if (!isGuest && msg.manual) {
        footer += '<span class="rc-bubble-manual">✋ Manual</span>';
      }
      if (!isGuest && msg.intent) {
        footer += '<span class="rc-bubble-intent">' + escapeHtml(msg.intent) + '</span>';
      }
      if (!isGuest && msg.confidence !== undefined) {
        const pct = Math.round(msg.confidence * 100);
        const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#ca8a04' : '#dc2626';
        footer += '<span class="rc-bubble-confidence" style="color:' + color + '">' + pct + '%</span>';
      }

      // Developer mode metadata
      let devMeta = '';
      if (devMode && !isGuest && !msg.manual) {
        const parts = [];
        if (msg.source) parts.push('Detection: ' + (msg.source === 'llm' ? '🤖 LLM' : msg.source.toUpperCase()));
        if (msg.intent) parts.push('Intent: ' + escapeHtml(msg.intent));
        if (msg.routedAction) parts.push('Routed to: ' + escapeHtml(msg.routedAction));
        if (msg.messageType) parts.push('Type: ' + escapeHtml(msg.messageType));
        if (msg.model) parts.push('Model: ' + escapeHtml(msg.model));
        if (msg.responseTime) parts.push('Time: ' + (msg.responseTime / 1000).toFixed(1) + 's');
        if (msg.confidence !== undefined) parts.push('Confidence: ' + Math.round(msg.confidence * 100) + '%');
        if (msg.kbFiles && msg.kbFiles.length > 0) parts.push('KB: ' + msg.kbFiles.map(f => escapeHtml(f)).join(', '));

        if (parts.length > 0) {
          devMeta = '<div class="rc-dev-meta">' + parts.join(' | ') + '</div>';
        }
      }

      html += '<div class="rc-bubble-wrap ' + side + '">' +
        '<div class="rc-bubble ' + side + '">' +
          '<div class="rc-bubble-text">' + escapeHtml(msg.content) + '</div>' +
          '<div class="rc-bubble-footer">' + footer + '</div>' +
          devMeta +
        '</div>' +
      '</div>';
    }

    container.innerHTML = html;
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  /**
   * Refresh the active chat (reload messages)
   */
  async function refreshActiveChat() {
    if (!_rcActivePhone) return;
    try {
      const log = await api('/conversations/' + encodeURIComponent(_rcActivePhone));
      renderChatView(log);
    } catch {}
  }

  // ─── Chat Actions ─────────────────────────────────────────────────

  /**
   * Delete the active conversation
   */
  async function deleteActiveChat() {
    if (!_rcActivePhone) return;
    if (!confirm('Delete this conversation log? This cannot be undone.')) return;
    try {
      await api('/conversations/' + encodeURIComponent(_rcActivePhone), { method: 'DELETE' });
      _rcActivePhone = null;
      document.getElementById('rc-active-chat').style.display = 'none';
      document.getElementById('rc-empty-state').style.display = '';
      loadRealChat();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  /**
   * Send manual reply from input box
   */
  async function sendManualReply() {
    if (!_rcActivePhone) return;
    const input = document.getElementById('rc-input-box');
    const message = input.value.trim();
    if (!message) return;

    const btn = document.getElementById('rc-send-btn');
    btn.disabled = true;

    try {
      const translateMode = StateManager.get('realChat.translateMode');
      const translateLang = StateManager.get('realChat.translateLang');

      // If translation mode is enabled, translate first and show confirmation
      if (translateMode && translateLang !== 'en') {
        try {
          const result = await api('/translate', {
            method: 'POST',
            body: { text: message, targetLang: translateLang }
          });

          // Store pending translation
          _rcPendingTranslation = {
            original: message,
            translated: result.translated,
            targetLang: translateLang
          };

          // Show confirmation modal
          showTranslateModal();
          return; // Wait for user confirmation
        } catch (err) {
          alert('Translation failed: ' + err.message);
          btn.disabled = false;
          return;
        }
      }

      // Get the instanceId from the active conversation
      const log = _rcConversations.find(c => c.phone === _rcActivePhone);
      const instanceId = log?.instanceId;

      await api('/conversations/' + encodeURIComponent(_rcActivePhone) + '/send', {
        method: 'POST',
        body: { message, instanceId }
      });

      // Clear input
      input.value = '';
      input.style.height = '40px';

      // Refresh the chat to show the sent message
      await refreshActiveChat();
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    } finally {
      btn.disabled = false;
      input.focus();
    }
  }

  // ─── Input Handlers ───────────────────────────────────────────────

  /**
   * Auto-resize textarea as user types
   * @param {HTMLTextAreaElement} textarea - Input element
   */
  function autoResizeInput(textarea) {
    textarea.style.height = '40px';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  }

  /**
   * Handle Enter key in input box (send message)
   * @param {KeyboardEvent} event - Keydown event
   */
  function handleInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendManualReply();
    }
  }

  // ─── Public API ───────────────────────────────────────────────────

  return {
    loadRealChat,
    toggleDevMode,
    toggleTranslateMode,
    handleLangChange,
    showTranslateModal,
    closeTranslateModal,
    confirmTranslation,
    buildInstanceFilter,
    renderConversationList,
    filterConversations,
    openConversation,
    renderChatView,
    refreshActiveChat,
    deleteActiveChat,
    sendManualReply,
    autoResizeInput,
    handleInputKeydown
  };
})();
