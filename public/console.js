(function () {
  var token = null, page = 1, pages = 1, isAdmin = false, logEl = document.getElementById('log');
  var hues = [20, 160, 45, 215, 280, 340, 100, 190];
  function $(id) { return document.getElementById(id); }
  function log(method, url, status, body) {
    logEl.textContent = method + ' ' + url + '  →  ' + status + '\n' + JSON.stringify(body, null, 2) + '\n\n' + (logEl.dataset.started ? logEl.textContent : '');
    logEl.dataset.started = '1';
  }
  function api(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { log(method, path, r.status, j); return { ok: r.ok, status: r.status, data: j }; }); });
  }
  function load() {
    var qs = '?page=' + page + '&limit=8';
    if ($('q').value.trim()) qs += '&q=' + encodeURIComponent($('q').value.trim());
    if ($('cat').value) qs += '&category=' + encodeURIComponent($('cat').value);
    api('GET', '/Products' + qs).then(function (r) {
      var list = r.data.products || []; pages = r.data.pages || 1;
      $('count').textContent = '(' + (r.data.total || 0) + ' products)';
      $('page').textContent = 'page ' + (r.data.pages ? page : 0) + ' / ' + pages;
      var box = $('products'); box.textContent = '';
      list.forEach(function (p, i) {
        var d = document.createElement('div'); d.className = 'course';
        var t = document.createElement('div'); t.className = 'thumb'; t.textContent = p.category.toUpperCase();
        var b = document.createElement('div'); b.className = 'b';
        var h = document.createElement('h3'); h.textContent = p.name;
        var cb = document.createElement('span'); cb.className = 'badge'; cb.textContent = p.category; var s = document.createElement('div'); s.className = 'stock'; s.textContent = p.brand + ' · ★ ' + p.rating + ' · ' + p.stock + ' in stock';
        var f = document.createElement('div'); f.className = 'f';
        var pr = document.createElement('span'); pr.className = 'price'; pr.textContent = '₹' + p.price; f.appendChild(pr);
        if (isAdmin) { var del = document.createElement('button'); del.className = 'danger'; del.textContent = 'Delete'; del.onclick = function () { api('DELETE', '/Products/admin/' + p._id).then(load); }; f.appendChild(del); }
        b.appendChild(cb); b.appendChild(h); b.appendChild(s); b.appendChild(f); d.appendChild(t); d.appendChild(b); box.appendChild(d);
      });
      if (!$('cat').dataset.filled && list.length) { fillCats(); }
    });
  }
  function fillCats() {
    $('cat').dataset.filled = '1';
    fetch('/Products?limit=50').then(function (r) { return r.json(); }).then(function (j) {
      var seen = {}; (j.products || []).forEach(function (p) { if (!seen[p.category]) { seen[p.category] = 1; var o = document.createElement('option'); o.value = p.category; o.textContent = p.category; $('cat').appendChild(o); } });
    });
  }
  var lastAct = 'login';
  document.querySelectorAll('#auth button[data-act]').forEach(function (b) { b.onclick = function () { lastAct = b.dataset.act; }; });
  $('auth').onsubmit = function (e) {
    e.preventDefault(); var f = e.target;
    var body = { email: f.email.value, password: f.password.value };
    var path = '/user/signin/password';
    if (lastAct === 'signup') {
      path = '/user/signup';
      body.name = f.name.value || 'New Shopper'; body.mobilNumber = '9' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
      body.address = { houseNumber: 1, streetNumber: 1, city: 'Udupi', zipcode: '576104', state: 'Karnataka' };
    }
    api('POST', path, body).then(function (r) {
      if (r.ok && r.data.token) {
        token = r.data.token;
        try { isAdmin = JSON.parse(atob(token.split('.')[1])).role === 'admin'; } catch (x) { isAdmin = false; }
        $('who').textContent = 'Signed in · ' + body.email + (isAdmin ? ' (admin)' : ''); $('adminCard').hidden = !isAdmin; load();
      } else if (r.ok) { $('who').textContent = 'Account created, now sign in'; }
      else { $('who').textContent = r.data.msg || 'Request failed'; }
    });
  };
  function fill(email) { $('auth').email.value = email; $('auth').password.value = 'Demo@12345'; }
  $('fillU').onclick = function () { fill('demo-user@desire.dev'); };
  $('fillA').onclick = function () { fill('demo-admin@desire.dev'); };
  $('add').onsubmit = function (e) {
    e.preventDefault(); var f = e.target;
    api('POST', '/Products/admin/add', { name: f.name.value, category: f.category.value, price: Number(f.price.value), stock: Number(f.stock.value), brand: f.brand.value, description: f.description.value }).then(function () { f.reset(); load(); });
  };
  $('otp').onsubmit = function (e) { e.preventDefault(); api('POST', '/user/signin/otp-email', { email: e.target.email.value }).then(function (r) { $('who').textContent = r.ok ? 'If the account exists, an OTP was sent' : (r.data.msg || 'OTP could not be sent'); }); };
  $('q').oninput = function () { page = 1; clearTimeout(window.__t); window.__t = setTimeout(load, 300); };
  $('cat').onchange = function () { page = 1; load(); };
  $('prev').onclick = function () { if (page > 1) { page--; load(); } };
  $('next').onclick = function () { if (page < pages) { page++; load(); } };
  load();
})();
