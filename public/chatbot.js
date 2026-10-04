/* ReviewRadar chat widget — drop-in, no dependencies. Talks to /api/chat (never to OpenRouter directly). */
(function () {
  var cfg = Object.assign({
    endpoint: '/api/chat',
    title: 'ReviewRadar help',
    subtitle: 'Usually replies in seconds',
    color: '#0a0a0a',
    welcome: 'Hi! Ask me anything about ReviewRadar: plans, NFC cards or how it works. Hindi ya English dono chalega.',
    placeholder: 'Type your message…',
  }, window.CHATBOT_CONFIG || {});

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var css = [
    '#cb-root{position:fixed;right:20px;bottom:20px;z-index:99999;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}',
    '#cb-root *{box-sizing:border-box}',
    '#cb-btn{width:58px;height:58px;border-radius:50%;border:0;background:var(--cb-c);color:#fff;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center}',
    '#cb-btn:focus-visible,#cb-send:focus-visible,#cb-input:focus-visible,#cb-close:focus-visible{outline:3px solid #00d4aa;outline-offset:2px}',
    '#cb-panel{display:none;flex-direction:column;position:absolute;right:0;bottom:72px;width:360px;max-width:calc(100vw - 24px);height:520px;max-height:calc(100vh - 110px);background:#fff;color:#1b1f24;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.28);overflow:hidden}',
    '#cb-panel.open{display:flex}',
    '#cb-head{background:var(--cb-c);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}',
    '#cb-head b{display:block;font-size:16px}#cb-head span{font-size:12px;opacity:.85}',
    '#cb-close{background:transparent;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1}',
    '#cb-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f5f6f8}',
    '.cb-m{max-width:84%;padding:10px 13px;border-radius:14px;font-size:14.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}',
    '.cb-u{align-self:flex-end;background:var(--cb-c);color:#fff;border-bottom-right-radius:4px}',
    '.cb-b{align-self:flex-start;background:#fff;border:1px solid #e3e6ea;border-bottom-left-radius:4px}',
    '.cb-err{align-self:flex-start;background:#fff1f0;border:1px solid #ffccc7;color:#a8071a}',
    '.cb-dots{display:inline-flex;gap:4px}.cb-dots i{width:6px;height:6px;border-radius:50%;background:#9aa3ad;animation:cbd 1s infinite}',
    '.cb-dots i:nth-child(2){animation-delay:.15s}.cb-dots i:nth-child(3){animation-delay:.3s}',
    '@keyframes cbd{0%,80%,100%{opacity:.3}40%{opacity:1}}',
    '#cb-form{display:flex;gap:8px;padding:10px;border-top:1px solid #e3e6ea;background:#fff}',
    '#cb-input{flex:1;border:1px solid #cfd4da;border-radius:10px;padding:10px 12px;font-size:14.5px;font-family:inherit}',
    '#cb-send{border:0;border-radius:10px;background:var(--cb-c);color:#fff;padding:0 16px;font-size:14.5px;cursor:pointer}',
    '#cb-send:disabled{opacity:.5;cursor:not-allowed}',
    '@media (prefers-reduced-motion:reduce){.cb-dots i{animation:none}}',
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.id = 'cb-root';
  root.style.setProperty('--cb-c', cfg.color);
  root.innerHTML =
    '<div id="cb-panel" role="dialog" aria-label="' + esc(cfg.title) + '">' +
      '<div id="cb-head"><div><b>' + esc(cfg.title) + '</b><span>' + esc(cfg.subtitle) + '</span></div>' +
      '<button id="cb-close" aria-label="Close chat">×</button></div>' +
      '<div id="cb-msgs" aria-live="polite"></div>' +
      '<form id="cb-form"><input id="cb-input" autocomplete="off" placeholder="' + esc(cfg.placeholder) + '" aria-label="Message">' +
      '<button id="cb-send" type="submit">Send</button></form>' +
    '</div>' +
    '<button id="cb-btn" aria-label="Open chat"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>';
  document.body.appendChild(root);

  var panel = root.querySelector('#cb-panel');
  var msgs  = root.querySelector('#cb-msgs');
  var form  = root.querySelector('#cb-form');
  var input = root.querySelector('#cb-input');
  var send  = root.querySelector('#cb-send');
  var history = [];
  var busy = false;

  function add(text, cls) {
    var d = document.createElement('div');
    d.className = 'cb-m ' + cls;
    d.textContent = text; // textContent = safe against XSS
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function toggle(open) { panel.classList.toggle('open', open); if (open) input.focus(); }

  root.querySelector('#cb-btn').onclick = function () { toggle(!panel.classList.contains('open')); };
  root.querySelector('#cb-close').onclick = function () { toggle(false); };
  add(cfg.welcome, 'cb-b');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    add(text, 'cb-u');
    history.push({ role: 'user', content: text });
    busy = true; send.disabled = true;
    var typing = add('', 'cb-b');
    typing.innerHTML = '<span class="cb-dots"><i></i><i></i><i></i></span>';

    fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-20) }),
    })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Request failed'); return j; }); })
      .then(function (j) { typing.textContent = j.reply; history.push({ role: 'assistant', content: j.reply }); })
      .catch(function (err) { typing.className = 'cb-m cb-err'; typing.textContent = 'Message nahi gaya: ' + err.message; history.pop(); })
      .finally(function () { busy = false; send.disabled = false; msgs.scrollTop = msgs.scrollHeight; input.focus(); });
  });
})();
