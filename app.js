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

  // ── SVG 유틸 ──
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function niceMax(v) {
    if (v <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v))), norm = v / mag, step;
    step = norm <= 1 ? mag * 0.2 : norm <= 2 ? mag * 0.5 : norm <= 5 ? mag : mag * 2;
    return Math.ceil(v / step) * step;
  }
  function makeTip(host) { var tip = document.createElement('div'); tip.className = 'chart-tip'; host.appendChild(tip); return tip; }
  function placeTip(host, svg, tip, W, H, px, py) {
    var r = host.getBoundingClientRect(), sr = svg.getBoundingClientRect();
    var x = sr.left - r.left + (px / W) * sr.width, y = sr.top - r.top + (py / H) * sr.height;
    tip.style.display = 'block';
    tip.style.left = Math.min(Math.max(x - tip.offsetWidth / 2, 0), r.width - tip.offsetWidth) + 'px';
    tip.style.top = Math.max(y - tip.offsetHeight - 10, 0) + 'px';
  }

  // ── 단일 계열 선 차트: data [{t, v}] ──
  function drawLine(host, data, opts) {
    opts = opts || {};
    host.innerHTML = '';
    if (!data || !data.length) { host.textContent = '기록 없음'; return; }
    var W = opts.width || host.clientWidth || 320, H = opts.height || 150, padL = 48, padR = 12, padT = 10, padB = 24;
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
    var tip = makeTip(host);
    function show(i) {
      dots.forEach(function (c, j) { c.setAttribute('r', j === i ? 6 : 4); });
      hover.setAttribute('x1', x(i)); hover.setAttribute('x2', x(i)); hover.style.display = 'block';
      tip.innerHTML = esc(fmtT(data[i].t)) + '<br><strong>' + fmtN(data[i].v) + '</strong>';
      placeTip(host, svg, tip, W, H, x(i), y(data[i].v));
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

  // ── 막대 차트: items [{label, value, sub?}] ──
  function drawBars(host, items, opts) {
    opts = opts || {};
    host.innerHTML = '';
    if (!items || !items.length) { host.textContent = '데이터 없음'; return; }
    var maxV = niceMax(Math.max.apply(null, items.map(function (d) { return Number(d.value) || 0; })));
    var svg, W, H, bars = [];
    if (opts.horizontal) {
      var rowH = 20, padL = 110, padR = 64, padT = 2;
      W = host.clientWidth || 640; H = padT + rowH * items.length + 4;
      svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H });
      svg.style.height = H + 'px';
      items.forEach(function (d, i) {
        var y = padT + i * rowH, w = (W - padL - padR) * (Number(d.value) || 0) / maxV;
        var lab = el('text', { x: padL - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end', 'class': 'bar-label' });
        lab.textContent = (i + 1) + '. ' + d.label; svg.appendChild(lab);
        var rect = el('rect', { x: padL, y: y + 4, width: Math.max(w, 2), height: rowH - 8, rx: 4, 'class': 'bar' });
        svg.appendChild(rect); bars.push(rect);
        var val = el('text', { x: padL + w + 6, y: y + rowH / 2 + 4, 'class': 'bar-value' });
        val.textContent = fmtShort(d.value); svg.appendChild(val);
      });
    } else {
      var n = items.length, padB = 26, padTop = 18, padX = 12;
      W = host.clientWidth || 640; H = 190;
      svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H });
      svg.style.height = H + 'px';
      var slot = (W - padX * 2) / n, bw = Math.min(slot * 0.6, 56);
      items.forEach(function (d, i) {
        var h = (H - padTop - padB) * (Number(d.value) || 0) / maxV;
        var x = padX + slot * i + (slot - bw) / 2, y = H - padB - h;
        var rect = el('rect', { x: x, y: y, width: bw, height: Math.max(h, 2), rx: 4, 'class': 'bar' });
        svg.appendChild(rect); bars.push(rect);
        var val = el('text', { x: x + bw / 2, y: y - 5, 'text-anchor': 'middle', 'class': 'bar-value' });
        val.textContent = fmtShort(d.value); svg.appendChild(val);
        var lab = el('text', { x: x + bw / 2, y: H - 8, 'text-anchor': 'middle', 'class': 'bar-label' });
        lab.textContent = d.label; svg.appendChild(lab);
      });
      svg.appendChild(el('line', { x1: padX, x2: W - padX, y1: H - padB, y2: H - padB, 'class': 'grid-line' }));
    }
    host.appendChild(svg);
    var tip = makeTip(host);
    bars.forEach(function (rect, i) {
      var d = items[i];
      function show() {
        rect.classList.add('hi');
        tip.innerHTML = esc(d.label) + (d.sub ? ' <span class="muted">' + esc(d.sub) + '</span>' : '') + '<br><strong>' + fmtN(d.value) + '</strong>';
        var bx = parseFloat(rect.getAttribute('x')), by = parseFloat(rect.getAttribute('y')), bw2 = parseFloat(rect.getAttribute('width'));
        placeTip(host, svg, tip, W, H, opts.horizontal ? bx + bw2 : bx + bw2 / 2, by);
      }
      function hide() { rect.classList.remove('hi'); tip.style.display = 'none'; }
      rect.addEventListener('mouseenter', show); rect.addEventListener('mouseleave', hide);
      rect.addEventListener('touchstart', show, { passive: true });
    });
  }

  // ── 비공개 데이터 잠금 해제 (PBKDF2 + AES-GCM, WebCrypto) ──
  var PW_KEY = 'um_admin_pw';
  function b64(s) { var bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function decryptBlob(blob, pw) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(blob.salt), iterations: blob.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    }).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(blob.iv) }, key, b64(blob.ct));
    }).then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }
  var privEl = document.getElementById('private-data');
  var lockBtn = document.getElementById('um-lock');
  var privBlob = null; try { privBlob = privEl ? JSON.parse(privEl.textContent) : null; } catch (e) { privBlob = null; }
  var onUnlock = [];   // 잠금 해제 시 콜백
  function setUnlocked(data) {
    document.body.classList.add('unlocked');
    if (lockBtn) { lockBtn.textContent = '관리자 모드'; lockBtn.classList.add('on'); }
    onUnlock.forEach(function (fn) { fn(data); });
  }
  function tryUnlock(pw, silent) {
    if (!privBlob || !window.crypto || !crypto.subtle) { if (!silent) alert('이 환경에서는 잠금 해제를 지원하지 않습니다 (https 필요).'); return Promise.resolve(false); }
    return decryptBlob(privBlob, pw).then(function (data) {
      try { sessionStorage.setItem(PW_KEY, pw); } catch (e) { /* ignore */ }
      setUnlocked(data); return true;
    }).catch(function () { return false; });
  }
  function openModal(title, bodyHtml, onReady) {
    var back = document.createElement('div'); back.className = 'um-modal-back';
    back.innerHTML = '<div class="um-modal"><div class="um-modal-head"><strong>' + esc(title) + '</strong><button type="button" class="um-close" aria-label="닫기">×</button></div><div class="um-modal-body">' + bodyHtml + '</div></div>';
    document.body.appendChild(back);
    var downOnBack = false;
    back.addEventListener('mousedown', function (e) { downOnBack = e.target === back; });
    back.addEventListener('mouseup', function (e) { if (downOnBack && e.target === back) close(); downOnBack = false; });
    back.querySelector('.um-close').addEventListener('click', close);
    function close() { back.remove(); document.removeEventListener('keydown', esc1); }
    function esc1(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc1);
    if (onReady) onReady(back, close);
    return close;
  }
  if (lockBtn) {
    if (!privBlob) lockBtn.style.display = 'none';
    lockBtn.addEventListener('click', function () {
      if (document.body.classList.contains('unlocked')) {
        try { sessionStorage.removeItem(PW_KEY); } catch (e) { /* ignore */ }
        location.reload(); return;
      }
      openModal('관리자 확인', '<form id="um-pw-form"><input type="password" id="um-pw" placeholder="관리자 비밀번호" autocomplete="current-password"><div class="um-err" id="um-err"></div><div class="um-actions"><button type="submit" class="btn btn-primary">확인</button></div></form>',
        function (back, close) {
          var inp = back.querySelector('#um-pw'); inp.focus();
          back.querySelector('#um-pw-form').addEventListener('submit', function (e) {
            e.preventDefault();
            tryUnlock(inp.value).then(function (ok) { if (ok) close(); else back.querySelector('#um-err').textContent = '비밀번호가 올바르지 않습니다.'; });
          });
        });
    });
    var saved = null; try { saved = sessionStorage.getItem(PW_KEY); } catch (e) { /* ignore */ }
    if (saved && privBlob) tryUnlock(saved, true);
  }

  // ── 정적 상세 페이지: 잠금 해제 시 메모·이전 닉네임 ──
  var privMemo = document.getElementById('priv-memo');
  if (privMemo) onUnlock.push(function (data) {
    privMemo.textContent = data.memo || '(메모 없음)';
    var al = document.getElementById('priv-alias'); if (al) al.textContent = data.aliases && data.aliases.length ? data.aliases.join(', ') : '(변경 없음)';
  });

  // ── 정적 목록 페이지 ──
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
    var R = JSON.parse(rosterEl.textContent);
    var members = R.rows, trend = R.trend || [], root = R.root || './';
    var priv = null, showFormer = false;
    var NUMERIC = { prosperity: 1, merit: 1, contribution: 1, siege_count: 1 };
    var st = { sort: 'merit', order: 'desc' };
    var table = document.getElementById('roster-table'), tbody = table.querySelector('tbody');
    var cards = document.getElementById('roster-cards'), countEl = document.getElementById('roster-count');
    var fq = document.getElementById('f-q'), fjob = document.getElementById('f-job'), fsort = document.getElementById('f-sort');
    var formerBtn = document.getElementById('f-former');
    function allRows() {
      var rows = members.map(function (m) { return m; });
      if (priv && showFormer) priv.former.forEach(function (f) { rows.push(Object.assign({ former: true }, f)); });
      return rows;
    }
    function filtered() {
      var q = (fq.value || '').trim().toLowerCase();
      return allRows().filter(function (m) {
        if (q) {
          var hay = String(m.nickname).toLowerCase() + ' ' + (aliasList(m).join(' ')).toLowerCase();
          if (hay.indexOf(q) < 0) return false;
        }
        if (fjob.value && m.job !== fjob.value) return false;
        return true;
      });
    }
    function aliasList(m) { return m.former ? (m.aliases || []) : ((priv && priv.aliases[m.char_id]) || []); }
    function memoOf(m) { return m.former ? (m.memo || '') : ((priv && priv.memos[m.char_id]) || ''); }
    function render() {
      var rows = sortRows(filtered(), st.sort, st.order, NUMERIC[st.sort]);
      paintSort(table, st);
      if (fsort) fsort.value = st.sort + ':' + st.order;
      countEl.textContent = rows.length;
      var html = '', chtml = '';
      if (!rows.length) html = '<tr><td class="empty-state" colspan="10">조건에 맞는 맹원이 없습니다.</td></tr>';
      rows.forEach(function (m, i) {
        var al = aliasList(m), memo = memoOf(m);
        var aliasHtml = al.length ? '<div class="alias">이전 닉네임: ' + esc(al.join(', ')) + '</div>' : '';
        var nameCell = m.former
          ? '<a href="#" class="fw-600 former-link" data-id="' + esc(m.char_id) + '">' + esc(m.nickname) + '</a> ' + statusBadge(m.status) + aliasHtml
          : '<a href="' + root + 'members/' + encodeURIComponent(m.char_id) + '.html" class="fw-600">' + esc(m.nickname) + '</a>' + aliasHtml;
        html += '<tr class="' + (m.former ? 'former' : '') + '"><td class="num">' + (i + 1) + '</td>' +
          '<td>' + nameCell + '</td>' +
          '<td>' + jobBadge(m.job) + '</td><td>' + esc(m.rank || '-') + '</td>' +
          '<td class="num">' + fmtN(m.prosperity) + '</td>' +
          '<td class="num" title="' + fmtN(m.merit) + '">' + fmtShort(m.merit) + '</td>' +
          '<td class="num">' + fmtN(m.contribution) + '</td><td class="num">' + fmtN(m.siege_count) + '</td>' +
          '<td class="nowrap">' + esc(m.garrison || '-') + '</td>' +
          '<td class="priv-col memo-cell">' + esc(memo) + '</td></tr>';
        var link = m.former ? '#' : root + 'members/' + encodeURIComponent(m.char_id) + '.html';
        chtml += '<a class="mcard ' + (m.former ? 'former former-link' : '') + '" href="' + link + '" data-id="' + esc(m.char_id) + '">' +
          '<div class="mcard-head"><div class="mcard-name"><span class="mcard-no">' + (i + 1) + '</span> ' + esc(m.nickname) + ' ' + jobBadge(m.job) + (m.former ? ' ' + statusBadge(m.status) : '') + '</div>' +
          '<div class="mcard-rank">' + esc(m.rank || '') + '</div></div>' +
          '<div class="mcard-sub">' + esc(m.garrison || '-') + (al.length ? ' · 이전 닉네임: ' + esc(al.join(', ')) : '') + '</div>' +
          (memo ? '<div class="mcard-memo priv-col">' + esc(memo) + '</div>' : '') +
          '<div class="mcard-stats">' +
          '<div class="mcard-stat hi"><div class="l">무훈</div><div class="v">' + fmtShort(m.merit) + '</div></div>' +
          '<div class="mcard-stat"><div class="l">공헌</div><div class="v">' + fmtN(m.contribution) + '</div></div>' +
          '<div class="mcard-stat"><div class="l">공성</div><div class="v">' + fmtN(m.siege_count) + '</div></div>' +
          '<div class="mcard-stat"><div class="l">번영</div><div class="v">' + fmtN(m.prosperity) + '</div></div>' +
          '</div></a>';
      });
      tbody.innerHTML = html; cards.innerHTML = chtml;
    }
    function showFormerDetail(id) {
      var f = priv && priv.former.filter(function (x) { return x.char_id === id; })[0];
      if (!f) return;
      var rows = (f.series || []).map(function (s) {
        return '<tr><td>' + (s.kind === 'history' ? '시즌' : '주간') + '</td><td class="nowrap">' + esc(fmtT(s.captured_at)) + '</td><td>' + esc(s.nickname) + '</td><td>' + esc(s.job) + '</td><td>' + esc(s.rank) + '</td>' +
          '<td class="num">' + fmtN(s.prosperity) + '</td><td class="num">' + fmtN(s.merit) + '</td><td class="num">' + fmtN(s.contribution) + '</td><td class="num">' + fmtN(s.siege_count) + '</td><td>' + esc(s.garrison || '') + '</td></tr>';
      }).join('');
      openModal(f.nickname + ' (' + (STATUS[f.status] || [f.status])[0] + ')',
        '<dl class="detail-grid"><dt>캐릭터 ID</dt><dd>' + esc(f.char_id) + '</dd><dt>이전 닉네임</dt><dd>' + esc((f.aliases || []).join(', ') || '-') + '</dd>' +
        '<dt>가입 확인</dt><dd>' + esc(fmtD(f.joined_at)) + '</dd><dt>마지막 확인</dt><dd>' + esc(fmtT(f.last_seen_at)) + '</dd>' +
        (f.left_at ? '<dt>처리일</dt><dd>' + esc(fmtD(f.left_at)) + '</dd>' : '') + '<dt>메모</dt><dd>' + esc(f.memo || '-') + '</dd></dl>' +
        '<div class="table-wrap mt-3"><table class="data-table"><thead><tr><th>구분</th><th>시각</th><th>닉네임</th><th>직업</th><th>직위</th><th class="num">번영</th><th class="num">무훈</th><th class="num">공헌</th><th class="num">공성</th><th>주둔지</th></tr></thead><tbody>' + rows + '</tbody></table></div>');
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('.former-link'); if (!a) return;
      e.preventDefault(); showFormerDetail(a.getAttribute('data-id'));
    });
    setupSortable(table, st, render);
    fq.addEventListener('input', render);
    fjob.addEventListener('change', render);
    if (fsort) fsort.addEventListener('change', function () { var p = fsort.value.split(':'); st.sort = p[0]; st.order = p[1]; render(); });
    var reset = document.getElementById('f-reset');
    if (reset) reset.addEventListener('click', function (ev) { ev.preventDefault(); fq.value = ''; fjob.value = ''; st.sort = 'merit'; st.order = 'desc'; render(); });
    if (formerBtn) formerBtn.addEventListener('click', function (ev) {
      ev.preventDefault(); showFormer = !showFormer;
      formerBtn.textContent = (showFormer ? '이전 맹원 숨기기' : '이전 맹원 보기') + ' (' + (priv ? priv.former.length : 0) + ')';
      render();
    });
    onUnlock.push(function (data) {
      priv = data;
      if (formerBtn) { formerBtn.style.display = priv.former.length ? '' : 'none'; formerBtn.textContent = '이전 맹원 보기 (' + priv.former.length + ')'; }
      render();
    });
    render();

    // 통계 패널
    var panel = document.getElementById('stats-panel'), body = document.getElementById('stats-body');
    var metric = document.getElementById('s-metric'), stoggle = document.getElementById('s-toggle');
    if (panel) {
      function countBy(key) {
        var map = {}; members.forEach(function (m) { var k = m[key] || '미정'; map[k] = (map[k] || 0) + 1; });
        return Object.keys(map).map(function (k) { return { label: k, value: map[k] }; }).sort(function (a, b) { return b.value - a.value; });
      }
      function renderStats() {
        if (panel.classList.contains('collapsed')) return;
        var parts = metric.value.split(':'), kind = parts[0], key = parts[1];
        if (kind === 'job' || kind === 'rank') {
          var items = countBy(kind); if (kind === 'rank' && items.length > 12) items = items.slice(0, 12);
          drawBars(body, items, { horizontal: false });
        } else if (kind === 'top') {
          var top = sortRows(members, key, 'desc', true).slice(0, 10).map(function (m) { return { label: m.nickname, sub: m.job, value: m[key] }; });
          drawBars(body, top, { horizontal: true });
        } else if (kind === 'hist') {
          drawLine(body, trend.map(function (t) { return { t: t.t, v: t[key] }; }), { height: 190 });
        }
      }
      metric.addEventListener('change', renderStats);
      redraws.push(renderStats);
      stoggle.addEventListener('click', function () {
        var c = panel.classList.toggle('collapsed');
        stoggle.textContent = c ? '펼치기' : '접기';
        if (!c) renderStats();
      });
      if (window.innerWidth <= 768) { panel.classList.add('collapsed'); stoggle.textContent = '펼치기'; }
      renderStats();
    }
  }
})();
