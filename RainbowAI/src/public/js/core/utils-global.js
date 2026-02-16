// ═══════════════════════════════════════════════════════════════════
// Global Utility Functions (loaded as regular script)
// These MUST be available globally before legacy-functions.js
// Module consumers (e.g. live-chat.js) rely on window.api and window.API
// ═══════════════════════════════════════════════════════════════════

function toast(msg, type) {
  type = type || 'success';
  var el = document.createElement('div');
  var colors = type === 'success' ? 'bg-success-500' : type === 'error' ? 'bg-danger-500' : 'bg-blue-500';
  el.className = 'toast ' + colors + ' text-white text-sm px-4 py-2 rounded-2xl shadow-medium';
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(function () { el.remove(); }, 3000);
}

function api(path, opts) {
  opts = opts || {};
  var timeout = opts.timeout || 30000;
  var controller = new AbortController();
  var timeoutId = setTimeout(function () { controller.abort(); }, timeout);

  return fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: controller.signal
  }).then(function (res) {
    clearTimeout(timeoutId);
    return res.text().then(function (text) {
      var data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        var t = (text || '').trim();
        if (t.substring(0, 9) === '<!DOCTYPE' || t.substring(0, 5) === '<html') {
          var on3002 = (typeof window !== 'undefined' && window.location.port === '3002');
          throw new Error(
            on3002
              ? 'Rainbow server returned a page instead of JSON. Restart the server: run start-all.bat or "cd RainbowAI && npm run dev". Then hard refresh (Ctrl+Shift+R).'
              : 'Server returned a page instead of data. Open the Rainbow dashboard at http://localhost:3002 (and ensure the Rainbow server is running: start-all.bat or "cd RainbowAI && npm run dev").'
          );
        }
        throw new Error('Server returned invalid JSON. Is the Rainbow server (port 3002) running? Run start-all.bat or "cd RainbowAI && npm run dev".');
      }
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      return data;
    });
  }).catch(function (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout after ' + timeout + 'ms');
    }
    throw error;
  });
}
if (typeof window !== 'undefined') { window.api = api; }

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Convert plain URLs in text to clickable <a> tags. Call AFTER escapeHtml(). */
function linkifyUrls(html) {
  return html.replace(/(https?:\/\/[^\s<&]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="lc-link">$1</a>');
}

function escapeAttr(s) {
  if (!s) return '';
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function formatRelativeTime(ts) {
  var now = Date.now();
  var then = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  var diff = now - then;
  var seconds = Math.floor(diff / 1000);
  var minutes = Math.floor(seconds / 60);
  var hours = Math.floor(minutes / 60);
  var days = Math.floor(hours / 24);
  if (days > 0) return days + 'd ago';
  if (hours > 0) return hours + 'h ago';
  if (minutes > 0) return minutes + 'm ago';
  return seconds + 's ago';
}

function formatDateTime(ts) {
  var date = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function hasSystemContent(content) {
  if (!content || typeof content !== 'string') return false;
  return content.indexOf('\n\n{"intent":') > 0 || content.indexOf('Please note: I may not have complete information') > 0;
}

function getUserMessage(content) {
  if (!content || typeof content !== 'string') return content;
  var s = content;
  var jsonStart = s.indexOf('\n\n{"intent":');
  if (jsonStart > 0) s = s.slice(0, jsonStart).trim();
  var disclaimerIdx = s.indexOf('Please note: I may not have complete information');
  if (disclaimerIdx > 0) s = s.slice(0, disclaimerIdx).replace(/\n+$/, '').trim();
  return s;
}

function formatSystemContent(content) {
  if (!content || typeof content !== 'string') return escapeHtml(content);

  var parts = content.split('\n\n{"intent":');
  if (parts.length === 1) return escapeHtml(content);

  var userMsg = parts[0].trim();
  var jsonPart = '{"intent":' + parts[1];

  var prettyJson = jsonPart;
  try {
    var parsed = JSON.parse(jsonPart);
    prettyJson = JSON.stringify(parsed, null, 2);
  } catch (e) { }

  return '<div class="lc-user-msg">' + escapeHtml(userMsg) + '</div>' +
    '<div class="lc-system-data">' +
    '<div class="lc-system-label">System Debug Info:</div>' +
    '<pre class="lc-system-json">' + escapeHtml(prettyJson) + '</pre>' +
    '</div>';
}
