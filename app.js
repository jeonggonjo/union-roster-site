/* 천하결전 맹원 관리 - 공용 스크립트 (관리 도구 + 정적 페이지) */
(function () {
  'use strict';

  // ── 모바일 내비 드로어 (관리 도구) ──
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('navMenu');
  var overlay = document.getElementById('navOverlay');
  var closeBtn = document.getElementById('navClose');
  function closeNav() { if (!menu) return; menu.classList.remove('open'); overlay && overlay.classList.remove('active'); toggle && toggle.classList.remove('active'); }
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = !menu.classList.contains('open');
      menu.classList.toggle('open', open); overlay && overlay.classList.toggle('active', open); toggle.classList.toggle('active', open);
    });
    overlay && overlay.addEventListener('click', closeNav);
    closeBtn && closeBtn.addEventListener('click', closeNav);
  }
  document.querySelectorAll('[data-check-all]').forEach(function (all) {
    var form = all.closest('form');
    all.addEventListener('change', function () {
      form.querySelectorAll('input[type="checkbox"]:not([data-check-all])').forEach(function (c) { c.checked = all.checked; });
    });
  });

  // ── 포맷 ──
  function fmtN(v) { return (v === null || v === undefined) ? '-' : Number(v).toLocaleString('ko-KR'); }
  function fmtShort(v) {
    var n = Number(v); if (v === null || v === undefined || isNaN(n)) return '-';
    if (Math.abs(n) >= 100000000) return (Math.round(n / 1000000) / 100) + '억';
    if (Math.abs(n) >= 10000) return Math.round(n / 10000).toLocaleString('ko-KR') + '만';
    return n.toLocaleString('ko-KR');
  }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmtT(t) { return t ? String(t).slice(0, 16).replace('T', ' ') : '-'; }
  function fmtD(t) { return t ? String(t).slice(0, 10) : '-'; }
  function localIso() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19); }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }

  // ── 커스텀 셀렉트 (position:fixed 팝업, 화면 벗어나면 위로 flip) ──
  var openSelect = null;
  function enhanceSelect(sel) {
    if (sel.dataset.enhanced) return;
    sel.dataset.enhanced = '1';
    var wrap = document.createElement('div'); wrap.className = 'custom-select';
    var trig = document.createElement('button'); trig.type = 'button'; trig.className = 'custom-select-trigger';
    var lab = document.createElement('span'); lab.className = 'cs-label'; trig.appendChild(lab);
    var opts = document.createElement('div'); opts.className = 'custom-select-options';
    sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(trig); wrap.appendChild(opts); wrap.appendChild(sel);
    sel.classList.add('cs-native'); sel.tabIndex = -1;
    function sync() {
      lab.textContent = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : '';
      opts.innerHTML = '';
      Array.prototype.forEach.call(sel.options, function (o, i) {
        var d = document.createElement('div'); d.className = 'custom-select-option' + (i === sel.selectedIndex ? ' selected' : ''); d.textContent = o.textContent;
        d.addEventListener('click', function () { sel.selectedIndex = i; sel.dispatchEvent(new Event('change', { bubbles: true })); sync(); close(); });
        opts.appendChild(d);
      });
    }
    function place() {
      var r = trig.getBoundingClientRect(), h = Math.min(opts.scrollHeight + 2, 262);
      var below = window.innerHeight - r.bottom - 8, up = below < h && r.top > below;
      wrap.classList.toggle('up', up);
      opts.style.width = r.width + 'px'; opts.style.left = r.left + 'px';
      opts.style.top = (up ? r.top - h - 4 : r.bottom + 4) + 'px';
      opts.style.maxHeight = (up ? Math.min(260, r.top - 8) : Math.min(260, below)) + 'px';
    }
    function open() { if (openSelect && openSelect !== close) openSelect(); wrap.classList.add('open'); place(); openSelect = close; }
    function close() { wrap.classList.remove('open', 'up'); if (openSelect === close) openSelect = null; }
    trig.addEventListener('click', function (e) { e.stopPropagation(); wrap.classList.contains('open') ? close() : open(); });
    sel.addEventListener('change', sync);
    window.addEventListener('resize', function () { if (wrap.classList.contains('open')) place(); });
    window.addEventListener('scroll', function () { if (wrap.classList.contains('open')) close(); }, true);
    sync();
    sel._csSync = sync;
  }
  document.addEventListener('click', function () { if (openSelect) openSelect(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openSelect) openSelect(); });
  document.querySelectorAll('.filter-static select, .search-body select').forEach(enhanceSelect);

  // ── SVG 선 차트 ──
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function niceMax(v) {
    if (v <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v))), norm = v / mag, step;
    step = norm <= 1 ? mag * 0.2 : norm <= 2 ? mag * 0.5 : norm <= 5 ? mag : mag * 2;
    return Math.ceil(v / step) * step;
  }
  function drawLine(host, data) {
    host.innerHTML = '';
    if (!data || !data.length) { host.textContent = '기록 없음'; return; }
    var W = host.clientWidth || 320, H = 150, padL = 48, padR = 12, padT = 10, padB = 24;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.style.height = H + 'px';
    var maxV = niceMax(Math.max.apply(null, data.map(function (d) { return Number(d.v) || 0; })));
    var n = data.length;
    var x = function (i) { return n === 1 ? (padL + (W - padL - padR) / 2) : padL + (W - padL - padR) * i / (n - 1); };
    var y = function (v) { return padT + (H - padT - padB) * (1 - (Number(v) || 0) / maxV); };
    [0, 0.5, 1].forEach(function (f) {
      var yy = padT + (H - padT - padB) * (1 - f);
      svg.appendChild(el('line', { x1: padL, x2: W - padR, y1: yy, y2: yy, 'class': 'grid-line' }));
      var t = el('text', { x: padL - 6, y: yy + 3, 'text-anchor': 'end', 'class': 'axis-label' });
      t.textContent = fmtShort(maxV * f); svg.appendChild(t);
    });
    var idxs = n <= 4 ? data.map(function (_, i) { return i; }) : [0, Math.floor((n - 1) / 2), n - 1];
    idxs.forEach(function (i) {
      var t = el('text', { x: x(i), y: H - 6, 'text-anchor': i === 0 && n > 1 ? 'start' : (i === n - 1 && n > 1 ? 'end' : 'middle'), 'class': 'axis-label' });
      t.textContent = String(data[i].t).slice(5, 10).replace('-', '/'); svg.appendChild(t);
    });
    if (n > 1) svg.appendChild(el('polyline', { points: data.map(function (d, i) { return x(i) + ',' + y(d.v); }).join(' '), 'class': 'series-line' }));
    var hover = el('line', { x1: 0, x2: 0, y1: padT, y2: H - padB, 'class': 'hover-line' }); svg.appendChild(hover);
    var dots = data.map(function (d, i) { var c = el('circle', { cx: x(i), cy: y(d.v), r: 4, 'class': 'series-dot' }); svg.appendChild(c); return c; });
    var hit = el('rect', { x: padL, y: padT, width: W - padL - padR, height: H - padT - padB, 'class': 'hit' }); svg.appendChild(hit);
    host.appendChild(svg);
    var tip = document.createElement('div'); tip.className = 'chart-tip'; host.appendChild(tip);
    function show(i) {
      dots.forEach(function (c, j) { c.setAttribute('r', j === i ? 6 : 4); });
      hover.setAttribute('x1', x(i)); hover.setAttribute('x2', x(i)); hover.style.display = 'block';
      tip.innerHTML = esc(fmtT(data[i].t)) + '<br><strong>' + fmtN(data[i].v) + '</strong>';
      var r = host.getBoundingClientRect(), sr = svg.getBoundingClientRect();
      var px = sr.left - r.left + (x(i) / W) * sr.width, py = sr.top - r.top + (y(data[i].v) / H) * sr.height;
      tip.style.display = 'block';
      tip.style.left = Math.min(Math.max(px - tip.offsetWidth / 2, 0), r.width - tip.offsetWidth) + 'px';
      tip.style.top = Math.max(py - tip.offsetHeight - 10, 0) + 'px';
    }
    function hide() { dots.forEach(function (c) { c.setAttribute('r', 4); }); hover.style.display = 'none'; tip.style.display = 'none'; }
    function onMove(ev) {
      var sr = svg.getBoundingClientRect();
      var cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - sr.left;
      var xv = cx / sr.width * W, best = 0, bd = Infinity;
      for (var i = 0; i < n; i++) { var dd = Math.abs(x(i) - xv); if (dd < bd) { bd = dd; best = i; } }
      show(best);
    }
    hit.addEventListener('mousemove', onMove); hit.addEventListener('mouseleave', hide);
    hit.addEventListener('touchstart', onMove, { passive: true }); hit.addEventListener('touchmove', onMove, { passive: true });
  }
  var redraws = [];
  document.querySelectorAll('[data-chart]').forEach(function (host) {
    var data; try { data = JSON.parse(host.getAttribute('data-chart')); } catch (e) { return; }
    var fn = function () { drawLine(host, data); }; redraws.push(fn); fn();
  });
  var rsT = null;
  window.addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(function () { redraws.forEach(function (f) { f(); }); }, 200); });

  // ── 모달·토스트 ──
  function openModal(opts) {
    var back = document.createElement('div'); back.className = 'um-modal-back';
    back.innerHTML = '<div class="um-modal ' + (opts.cls || '') + '"><div class="um-modal-head"><strong>' + esc(opts.title || '') + '</strong><button type="button" class="um-close" aria-label="닫기">×</button></div><div class="um-modal-body">' + opts.body + '</div></div>';
    document.body.appendChild(back);
    var downOnBack = false;
    back.addEventListener('mousedown', function (e) { downOnBack = e.target === back; });
    back.addEventListener('mouseup', function (e) { if (downOnBack && e.target === back) close(); downOnBack = false; });
    back.querySelector('.um-close').addEventListener('click', close);
    function close() { back.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    if (opts.onReady) opts.onReady(back, close);
    return close;
  }
  var toastEl = null, toastT = null;
  function toast(msg, kind) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'um-toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.className = 'um-toast show ' + (kind || '');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, kind === 'err' ? 5000 : 2200);
  }
  var EYE = '<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var LOCK = '<svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  // ── 암호화 (PBKDF2 + AES-GCM, WebCrypto) ──
  var ITER = 300000;
  function b64d(s) { var bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function b64e(buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function deriveKey(pw, salt, iter, usage) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, usage);
    });
  }
  function decryptBlob(blob, pw) {
    return deriveKey(pw, b64d(blob.salt), blob.iter || ITER, ['decrypt']).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(blob.iv) }, key, b64d(blob.ct));
    }).then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }
  function encryptBlob(obj, pw) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(pw, salt, ITER, ['encrypt']).then(function (key) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
    }).then(function (ct) { return { v: 1, iter: ITER, salt: b64e(salt), iv: b64e(iv), ct: b64e(ct) }; });
  }
  function utf8b64(s) { return b64e(new TextEncoder().encode(s)); }
  function b64utf8(s) { return new TextDecoder().decode(b64d(s.replace(/\n/g, ''))); }

  // ── 게시 페이지: 비밀번호로 잠금 해제 (비공개 데이터 + 저장용 설정) ──
  var PW_KEY = 'um_admin_pw';
  var privEl = document.getElementById('private-data');
  var lockBtn = document.getElementById('um-lock');
  var privBlob = null; try { privBlob = privEl ? JSON.parse(privEl.textContent) : null; } catch (e) { privBlob = null; }
  var adminPw = null, onUnlock = [];
  function setUnlocked(data) {
    document.body.classList.add('unlocked');
    if (lockBtn) { lockBtn.textContent = data.remote ? '관리자 모드' : '관리자 보기'; lockBtn.classList.add('on'); }
    onUnlock.forEach(function (fn) { fn(data); });
  }
  function tryUnlock(pw, silent) {
    if (!privBlob || !window.crypto || !crypto.subtle) { if (!silent) toast('이 환경에서는 잠금 해제를 지원하지 않습니다 (https 필요)', 'err'); return Promise.resolve(false); }
    return decryptBlob(privBlob, pw).then(function (data) {
      adminPw = pw;
      try { sessionStorage.setItem(PW_KEY, pw); } catch (e) { /* ignore */ }
      setUnlocked(data); return true;
    }).catch(function () { return false; });
  }
  function askPassword() {
    openModal({ cls: 'um-auth', body:
      '<div class="um-auth-icon">' + LOCK + '</div><h3>관리자 모드</h3><div class="um-sub">비밀번호를 입력하면 메모, 이전 맹원, 시즌3 편집이 열립니다.</div>' +
      '<form id="um-pw-form"><div class="um-field"><input type="password" id="um-pw" placeholder="관리자 비밀번호" autocomplete="current-password"><button type="button" class="um-eye" id="um-eye" aria-label="표시">' + EYE + '</button></div>' +
      '<div class="um-err" id="um-err"></div><button type="submit" class="um-primary" id="um-go">잠금 해제</button></form>' +
      '<div class="um-foot">이 기기에서만 해제되며, 브라우저 탭을 닫으면 다시 잠깁니다.</div>',
      onReady: function (back, close) {
        var inp = back.querySelector('#um-pw'), err = back.querySelector('#um-err'), go = back.querySelector('#um-go');
        setTimeout(function () { inp.focus(); }, 50);
        back.querySelector('#um-eye').addEventListener('click', function () { inp.type = inp.type === 'password' ? 'text' : 'password'; inp.focus(); });
        back.querySelector('#um-pw-form').addEventListener('submit', function (e) {
          e.preventDefault(); inp.classList.remove('err'); err.textContent = ''; go.disabled = true; go.textContent = '확인 중…';
          tryUnlock(inp.value).then(function (ok) {
            if (ok) { close(); toast('관리자 모드가 켜졌습니다', 'ok'); }
            else { go.disabled = false; go.textContent = '잠금 해제'; inp.classList.add('err'); err.textContent = '비밀번호가 올바르지 않습니다.'; inp.select(); }
          });
        });
      } });
  }
  if (lockBtn) {
    if (!privBlob) lockBtn.style.display = 'none';
    lockBtn.addEventListener('click', function () {
      if (document.body.classList.contains('unlocked')) {
        if (dirty) { toast('저장 중인 내용이 있습니다. 잠시 후 다시 시도하세요', 'err'); return; }
        try { sessionStorage.removeItem(PW_KEY); } catch (e) { /* ignore */ } location.reload(); return;
      }
      askPassword();
    });
    var saved = null; try { saved = sessionStorage.getItem(PW_KEY); } catch (e) { /* ignore */ }
    if (saved && privBlob) tryUnlock(saved, true);
  }

  // ── 저장 경로 두 가지 ──
  //  LOCAL : 내 PC 관리 도구가 렌더한 페이지 → /api/edit 로 DB에 즉시 저장
  //  REMOTE: 게시 페이지 → 비밀번호로 풀린 토큰으로 저장소 data/admin.json(암호화)에 커밋 (1.5초 후 자동)
  var LOCAL = false, REMOTE = null, CFG = null;
  var adm = null, dirty = false, saveTimer = null, saving = false;
  function apiEdit(charId, field, value) {
    return fetch('/api/edit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ char_id: charId, field: field, value: value }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || ('저장 실패 ' + r.status)); return j; }); });
  }
  function ghUrl() { return 'https://api.github.com/repos/' + encodeURIComponent(REMOTE.repo.owner) + '/' + encodeURIComponent(REMOTE.repo.repo) + '/contents/' + REMOTE.adminFile; }
  function ghHeaders() { return { 'Authorization': 'Bearer ' + REMOTE.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }; }
  function loadAdmin(root) {
    var viaApi = fetch(ghUrl() + '?ref=' + encodeURIComponent(REMOTE.repo.branch), { headers: ghHeaders(), cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('api ' + r.status); return r.json(); })
      .then(function (j) { return JSON.parse(b64utf8(j.content)); });
    return viaApi.catch(function () {
      return fetch(root + REMOTE.adminFile + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('file ' + r.status); return r.json(); });
    }).then(function (blob) { return decryptBlob(blob, adminPw); })
      .then(function (doc) { adm = doc || {}; adm.memos = adm.memos || {}; adm.season3 = adm.season3 || {}; adm.status = adm.status || {}; return adm; })
      .catch(function () { adm = { v: 1, updated_at: null, memos: {}, season3: {}, status: {} }; return adm; });
  }
  function markDirty() {
    dirty = true; if (lockBtn) lockBtn.classList.add('dirty');
    clearTimeout(saveTimer); saveTimer = setTimeout(saveAdmin, 1500);
  }
  function saveAdmin() {
    if (!dirty || saving || !REMOTE) return;
    saving = true; toast('저장 중…');
    adm.updated_at = localIso();
    var payload;
    encryptBlob(adm, adminPw).then(function (blob) {
      payload = JSON.stringify(blob);
      return fetch(ghUrl() + '?ref=' + encodeURIComponent(REMOTE.repo.branch), { headers: ghHeaders(), cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; });
    }).then(function (cur) {
      var body = { message: '관리자 수정 ' + adm.updated_at.replace('T', ' '), content: utf8b64(payload), branch: REMOTE.repo.branch };
      if (cur && cur.sha) body.sha = cur.sha;
      return fetch(ghUrl(), { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()), body: JSON.stringify(body) });
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error((r.status === 401 || r.status === 403) ? '저장 권한 오류 (' + r.status + '): PC 관리 도구에서 토큰을 확인하고 다시 게시하세요' : (j.message || ('저장 실패 ' + r.status))); });
      dirty = false; saving = false; if (lockBtn) lockBtn.classList.remove('dirty');
      toast('저장됨 · 1분쯤 뒤 페이지에 반영됩니다', 'ok');
    }).catch(function (e) { saving = false; toast(String(e.message || e), 'err'); });
  }
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  function memoModal(name, current, onSave) {
    openModal({ cls: 'um-memo', title: name + ' 메모', body:
      '<textarea id="um-memo-text" placeholder="메모를 입력하세요">' + esc(current || '') + '</textarea>' +
      '<div class="um-actions"><button type="button" class="btn btn-secondary" id="um-memo-clear">지우기</button><button type="button" class="btn btn-primary" id="um-memo-save">저장</button></div>',
      onReady: function (back, close) {
        var ta = back.querySelector('#um-memo-text'); setTimeout(function () { ta.focus(); }, 50);
        back.querySelector('#um-memo-save').addEventListener('click', function () { onSave(ta.value.trim()); close(); });
        back.querySelector('#um-memo-clear').addEventListener('click', function () { onSave(''); close(); });
      } });
  }

  // ── 상세 페이지 ──
  var memberEl = document.getElementById('member-data');
  var privMemo = document.getElementById('priv-memo');
  if (memberEl) {
    var M = JSON.parse(memberEl.textContent);
    var s3badge = document.getElementById('s3-badge'), btnS3 = document.getElementById('btn-s3'), btnMemo = document.getElementById('btn-memo'), actions = document.getElementById('member-admin-actions');
    var embedded = null;
    function s3Of() { return has(adm && adm.season3, M.char_id) ? !!adm.season3[M.char_id] : !!M.season3; }
    function memoOfM() { return has(adm && adm.memos, M.char_id) ? adm.memos[M.char_id] : (embedded ? embedded.memo : ''); }
    function paintMember() {
      if (s3badge) s3badge.hidden = !s3Of();
      if (btnS3) btnS3.textContent = s3Of() ? '시즌3에서 빼기' : '시즌3에 넣기';
      if (privMemo) privMemo.textContent = memoOfM() || '(메모 없음)';
      var al = document.getElementById('priv-alias'); if (al && embedded) al.textContent = embedded.aliases && embedded.aliases.length ? embedded.aliases.join(', ') : '(변경 없음)';
    }
    onUnlock.push(function (data) {
      embedded = data;
      if (data.remote) { REMOTE = data.remote; loadAdmin(M.root || '../').then(function () { if (actions) { actions.hidden = false; actions.classList.add('priv-actions-open'); } paintMember(); }); }
      else paintMember();
    });
    if (btnS3) btnS3.addEventListener('click', function () { if (!REMOTE) return; adm.season3[M.char_id] = s3Of() ? 0 : 1; paintMember(); markDirty(); });
    if (btnMemo) btnMemo.addEventListener('click', function () { if (!REMOTE) return; memoModal(document.querySelector('h1').textContent, memoOfM(), function (v) { adm.memos[M.char_id] = v; paintMember(); markDirty(); }); });
  }

  // ── 목록 페이지 ──
  var JOB_CLS = { '진군': 'badge-red', '병참': 'badge-yellow', '청낭': 'badge-green', '천공': 'badge-blue', '신행': 'badge-purple' };
  var STATUS = { active: ['미확인', 'badge-gray'], left: ['탈퇴', 'badge-gray'], kicked: ['추방', 'badge-red'] };
  function jobBadge(j) { return j ? '<span class="badge ' + (JOB_CLS[j] || 'badge-gray') + '">' + esc(j) + '</span>' : ''; }
  function statusBadge(s) { var v = STATUS[s] || [s, 'badge-gray']; return '<span class="badge ' + v[1] + '">' + esc(v[0]) + '</span>'; }
  function setupSortable(table, state, onChange) {
    table.querySelectorAll('th[data-key]').forEach(function (th) {
      th.setAttribute('data-sortable', '');
      (th.querySelector('a') || th).addEventListener('click', function (ev) {
        ev.preventDefault();
        var key = th.getAttribute('data-key');
        if (state.sort === key) state.order = state.order === 'desc' ? 'asc' : 'desc';
        else { state.sort = key; state.order = th.classList.contains('num') ? 'desc' : 'asc'; }
        onChange();
      });
    });
  }
  function paintSort(table, state) {
    table.querySelectorAll('th[data-key]').forEach(function (th) {
      var key = th.getAttribute('data-key'), arrow = th.querySelector('.sort-arrow');
      if (!arrow) { arrow = document.createElement('span'); arrow.className = 'sort-arrow'; (th.querySelector('a') || th).appendChild(arrow); }
      var active = state.sort === key;
      arrow.className = 'sort-arrow' + (active ? ' active' : '');
      arrow.textContent = active && state.order === 'asc' ? '▲' : '▼';
    });
  }
  function sortRows(rows, key, order, numeric) {
    var dir = order === 'asc' ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (numeric) { av = Number(av) || 0; bv = Number(bv) || 0; return (av - bv) * dir || String(a.nickname).localeCompare(String(b.nickname), 'ko'); }
      return String(av || '').localeCompare(String(bv || ''), 'ko') * dir || String(a.nickname).localeCompare(String(b.nickname), 'ko');
    });
  }

  var rosterEl = document.getElementById('roster-data');
  if (rosterEl) {
    var R = JSON.parse(rosterEl.textContent); CFG = R;
    var members = R.rows, root = R.root || './', mode = R.mode || 'all';
    LOCAL = !!R.local;
    var priv = null, showFormer = false;
    var NUMERIC = { prosperity: 1, merit: 1, contribution: 1, siege_count: 1 };
    var st = { sort: 'merit', order: 'desc' };
    var table = document.getElementById('roster-table'), tbody = table.querySelector('tbody');
    var cards = document.getElementById('roster-cards'), countEl = document.getElementById('roster-count'), totalEl = document.getElementById('roster-total');
    var fq = document.getElementById('f-q'), fjob = document.getElementById('f-job');
    var formerBtn = document.getElementById('f-former'), hintEl = document.getElementById('admin-hint');
    function canEdit() { return LOCAL || !!REMOTE; }
    function s3(m) { return has(adm && adm.season3, m.char_id) ? !!adm.season3[m.char_id] : !!m.season3; }
    function memoOf(m) {
      if (has(adm && adm.memos, m.char_id)) return adm.memos[m.char_id] || '';
      return m.former ? (m.memo || '') : ((priv && priv.memos[m.char_id]) || '');
    }
    function statusOf(m) { return (adm && adm.status && adm.status[m.char_id]) || m.status; }
    function aliasList(m) { return m.former ? (m.aliases || []) : ((priv && priv.aliases[m.char_id]) || []); }
    function baseRows() {
      var rows = members.filter(function (m) { return mode !== 'season3' || s3(m); });
      if (mode !== 'season3' && priv && showFormer) priv.former.forEach(function (f) { rows.push(Object.assign({ former: true }, f)); });
      return rows;
    }
    function filtered() {
      var q = (fq.value || '').trim().toLowerCase();
      return baseRows().filter(function (m) {
        if (q && (String(m.nickname).toLowerCase() + ' ' + aliasList(m).join(' ').toLowerCase()).indexOf(q) < 0) return false;
        if (fjob.value && m.job !== fjob.value) return false;
        return true;
      });
    }
    function render() {
      var rows = sortRows(filtered(), st.sort, st.order, NUMERIC[st.sort]);
      paintSort(table, st);
      countEl.textContent = rows.length;
      if (totalEl && mode === 'season3') totalEl.textContent = members.filter(s3).length;
      var edit = canEdit();
      var html = '', chtml = '';
      if (!rows.length) html = '<tr><td class="empty-state" colspan="11">조건에 맞는 맹원이 없습니다.</td></tr>';
      rows.forEach(function (m, i) {
        var al = aliasList(m), memo = memoOf(m), on = s3(m), id = esc(m.char_id);
        var aliasHtml = al.length ? '<div class="alias">이전 닉네임: ' + esc(al.join(', ')) + '</div>' : '';
        var nameCell = m.former
          ? '<a href="#" class="fw-600 former-link" data-id="' + id + '">' + esc(m.nickname) + '</a> ' + statusBadge(statusOf(m)) + aliasHtml
          : '<a href="' + root + 'members/' + encodeURIComponent(m.char_id) + '.html" class="fw-600">' + esc(m.nickname) + '</a>' + (mode !== 'season3' && on ? ' <span class="badge badge-mint">시즌3</span>' : '') + aliasHtml;
        var s3cell = m.former ? '' : (edit ? '<button type="button" class="s3-chip ' + (on ? 'on' : '') + '" data-s3="' + id + '">' + (on ? '시즌3' : '미정') + '</button>' : (on ? '<span class="badge badge-mint">시즌3</span>' : '<span class="badge badge-gray">미정</span>'));
        var memoCell = '<span class="memo-text">' + esc(memo) + '</span>' + (edit ? '<button type="button" class="memo-btn ' + (memo ? 'has' : '') + '" data-memo="' + id + '">' + (memo ? '수정' : '메모 입력') + '</button>' : '');
        html += '<tr class="' + (m.former ? 'former' : '') + '"><td class="num">' + (i + 1) + '</td>' +
          '<td>' + nameCell + '</td>' +
          '<td>' + jobBadge(m.job) + '</td><td>' + esc(m.rank || '-') + '</td>' +
          '<td class="num">' + fmtN(m.prosperity) + '</td>' +
          '<td class="num" title="' + fmtN(m.merit) + '">' + fmtShort(m.merit) + '</td>' +
          '<td class="num">' + fmtN(m.contribution) + '</td><td class="num">' + fmtN(m.siege_count) + '</td>' +
          '<td class="nowrap">' + esc(m.garrison || '-') + '</td>' +
          '<td class="priv-col">' + s3cell + '</td>' +
          '<td class="priv-col memo-cell">' + memoCell + '</td></tr>';
        var link = m.former ? '#' : root + 'members/' + encodeURIComponent(m.char_id) + '.html';
        chtml += '<div class="mcard ' + (m.former ? 'former' : '') + '">' +
          '<a class="mcard-link' + (m.former ? ' former-link' : '') + '" href="' + link + '" data-id="' + id + '">' +
          '<div class="mcard-head"><div class="mcard-name"><span class="mcard-no">' + (i + 1) + '</span> ' + esc(m.nickname) + ' ' + jobBadge(m.job) + (m.former ? ' ' + statusBadge(statusOf(m)) : (mode !== 'season3' && on ? ' <span class="badge badge-mint">시즌3</span>' : '')) + '</div>' +
          '<div class="mcard-rank">' + esc(m.rank || '') + '</div></div>' +
          '<div class="mcard-sub">' + esc(m.garrison || '-') + (al.length ? ' · 이전 닉네임: ' + esc(al.join(', ')) : '') + '</div>' +
          (memo ? '<div class="mcard-memo priv-col">' + esc(memo) + '</div>' : '') +
          '<div class="mcard-stats">' +
          '<div class="mcard-stat hi"><div class="l">무훈</div><div class="v">' + fmtShort(m.merit) + '</div></div>' +
          '<div class="mcard-stat"><div class="l">공헌</div><div class="v">' + fmtN(m.contribution) + '</div></div>' +
          '<div class="mcard-stat"><div class="l">공성</div><div class="v">' + fmtN(m.siege_count) + '</div></div>' +
          '<div class="mcard-stat"><div class="l">번영</div><div class="v">' + fmtN(m.prosperity) + '</div></div>' +
          '</div></a>' +
          (edit ? '<div class="mcard-admin">' + s3cell + '<button type="button" class="memo-btn ' + (memo ? 'has' : '') + '" data-memo="' + id + '">' + (memo ? '메모 수정' : '메모 입력') + '</button></div>' : '') +
          '</div>';
      });
      tbody.innerHTML = html; cards.innerHTML = chtml;
    }
    function findRow(id) { var m = members.filter(function (x) { return x.char_id === id; })[0]; if (!m && priv) { var f = priv.former.filter(function (x) { return x.char_id === id; })[0]; if (f) m = Object.assign({ former: true }, f); } return m; }
    // 저장 경로 통합: 성공 시 onDone(로컬 상태 갱신) 실행
    function save(charId, field, value, onDone) {
      if (LOCAL) return apiEdit(charId, field, value).then(function () { onDone(); render(); toast('저장됨', 'ok'); }).catch(function (e) { toast(e.message, 'err'); });
      if (REMOTE) { if (field === 'memo') adm.memos[charId] = value; else if (field === 'season3') adm.season3[charId] = value ? 1 : 0; else if (field === 'status') adm.status[charId] = value; onDone(); render(); markDirty(); return Promise.resolve(); }
      return Promise.resolve();
    }
    function showFormerDetail(id) {
      var f = priv && priv.former.filter(function (x) { return x.char_id === id; })[0];
      if (!f) return;
      var rows = (f.series || []).map(function (s) {
        return '<tr><td>' + (s.kind === 'history' ? '시즌' : '주간') + '</td><td class="nowrap">' + esc(fmtT(s.captured_at)) + '</td><td>' + esc(s.nickname) + '</td><td>' + esc(s.job) + '</td><td>' + esc(s.rank) + '</td>' +
          '<td class="num">' + fmtN(s.prosperity) + '</td><td class="num">' + fmtN(s.merit) + '</td><td class="num">' + fmtN(s.contribution) + '</td><td class="num">' + fmtN(s.siege_count) + '</td><td>' + esc(s.garrison || '') + '</td></tr>';
      }).join('');
      var cur = statusOf(f);
      openModal({ title: f.nickname + ' (' + (STATUS[cur] || [cur])[0] + ')', body:
        '<dl class="detail-grid"><dt>캐릭터 ID</dt><dd>' + esc(f.char_id) + '</dd><dt>이전 닉네임</dt><dd>' + esc((f.aliases || []).join(', ') || '-') + '</dd>' +
        '<dt>가입 확인</dt><dd>' + esc(fmtD(f.joined_at)) + '</dd><dt>마지막 확인</dt><dd>' + esc(fmtT(f.last_seen_at)) + '</dd>' +
        (f.left_at ? '<dt>처리일</dt><dd>' + esc(fmtD(f.left_at)) + '</dd>' : '') + '<dt>메모</dt><dd id="fm-memo">' + esc(memoOf(f) || '-') + '</dd></dl>' +
        (canEdit() ? '<div class="priv-actions priv-actions-open mt-2">' +
          '<button type="button" class="btn-action-sm" data-st="left">탈퇴 처리</button><button type="button" class="btn-action-sm delete" data-st="kicked">추방 처리</button><button type="button" class="btn-action-sm" data-st="active">미확인으로 되돌리기</button>' +
          '<button type="button" class="btn-action-sm add" id="fm-memo-btn">메모 입력</button></div>' : '') +
        '<div class="table-wrap mt-3"><table class="data-table"><thead><tr><th>구분</th><th>시각</th><th>닉네임</th><th>직업</th><th>직위</th><th class="num">번영</th><th class="num">무훈</th><th class="num">공헌</th><th class="num">공성</th><th>주둔지</th></tr></thead><tbody>' + rows + '</tbody></table></div>',
        onReady: function (back, close) {
          if (!canEdit()) return;
          back.querySelectorAll('[data-st]').forEach(function (b) { b.addEventListener('click', function () {
            var v = b.getAttribute('data-st'); save(f.char_id, 'status', v, function () { f.status = v; }); close();
          }); });
          back.querySelector('#fm-memo-btn').addEventListener('click', function () { memoModal(f.nickname, memoOf(f), function (v) {
            save(f.char_id, 'memo', v, function () { f.memo = v; back.querySelector('#fm-memo').textContent = v || '-'; });
          }); });
        } });
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('.former-link'); if (a) { e.preventDefault(); showFormerDetail(a.getAttribute('data-id')); return; }
      if (!canEdit()) return;
      var s = e.target.closest('[data-s3]'); if (s) {
        var id = s.getAttribute('data-s3'), m = findRow(id); if (!m) return;
        var nv = s3(m) ? 0 : 1;
        save(id, 'season3', nv, function () { m.season3 = nv; }); return;
      }
      var mb = e.target.closest('[data-memo]') || e.target.closest('td.memo-cell'); if (mb) {
        var mid = mb.getAttribute('data-memo') || (mb.querySelector('[data-memo]') && mb.querySelector('[data-memo]').getAttribute('data-memo'));
        var mm = findRow(mid); if (!mm) return;
        memoModal(mm.nickname, memoOf(mm), function (v) { save(mid, 'memo', v, function () { if (mm.former) mm.memo = v; else if (priv) priv.memos[mid] = v; }); });
      }
    });
    setupSortable(table, st, render);
    fq.addEventListener('input', render);
    fjob.addEventListener('change', render);
    var reset = document.getElementById('f-reset');
    if (reset) reset.addEventListener('click', function (ev) { ev.preventDefault(); fq.value = ''; fjob.value = ''; if (fjob._csSync) fjob._csSync(); st.sort = 'merit'; st.order = 'desc'; render(); });
    if (formerBtn) formerBtn.addEventListener('click', function (ev) {
      ev.preventDefault(); showFormer = !showFormer;
      formerBtn.textContent = (showFormer ? '이전 맹원 숨기기' : '이전 맹원 보기') + ' (' + (priv ? priv.former.length : 0) + ')';
      render();
    });
    function applyPriv(data) {
      priv = data;
      if (formerBtn) { formerBtn.style.display = priv.former.length ? '' : 'none'; formerBtn.textContent = '이전 맹원 보기 (' + priv.former.length + ')'; }
      render();
    }
    onUnlock.push(function (data) {
      if (data.remote) {
        REMOTE = data.remote;
        loadAdmin(root).then(function () { if (hintEl) hintEl.textContent = '· 수정하면 자동 저장 (1분쯤 뒤 페이지 반영)'; applyPriv(data); });
      } else { if (hintEl) hintEl.textContent = '· 보기 전용 (저장용 토큰이 등록되지 않음)'; applyPriv(data); }
    });
    if (LOCAL) {
      fetch('/api/private').then(function (r) { return r.json(); }).then(function (data) {
        document.body.classList.add('unlocked');
        if (hintEl) hintEl.textContent = '· 내 PC 수정 모드: 바로 저장 (게시 전까지 페이지에는 미반영)';
        applyPriv(data);
      }).catch(function () { toast('비공개 데이터를 불러오지 못했습니다', 'err'); });
    }
    render();
  }
})();
