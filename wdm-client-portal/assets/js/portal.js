/* WD Morgan Client Portal — front end (no dependencies) */
(function () {
	'use strict';

	var C = window.WDMCP || {};
	var T = C.i18n || {};
	var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
	var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
	var fmt = function (s) { var a = arguments, i = 1; return String(s).replace(/%(\d\$)?[sd]/g, function () { return a[i++]; }); };

	function esc(s) {
		return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
	}
	function size(b) {
		if (b < 1024) return b + ' B';
		var u = ['KB', 'MB', 'GB'], i = -1;
		do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
		return (b >= 10 ? Math.round(b) : b.toFixed(1)) + ' ' + u[i];
	}
	function ext(name) { var m = /\.([^.]+)$/.exec(name); return m ? m[1].toLowerCase() : ''; }

	function post(action, data) {
		var fd = data instanceof FormData ? data : new FormData();
		if (!(data instanceof FormData) && data) {
			Object.keys(data).forEach(function (k) {
				if (Array.isArray(data[k])) data[k].forEach(function (v) { fd.append(k + '[]', v); });
				else fd.append(k, data[k]);
			});
		}
		fd.append('action', 'wdmcp_' + action);
		fd.append('nonce', C.nonce);
		return fetch(C.ajax, { method: 'POST', body: fd, credentials: 'same-origin' })
			.then(function (r) { return r.json().catch(function () { return { success: false }; }); })
			.then(function (j) {
				if (!j || !j.success) throw new Error((j && j.data && j.data.message) || T.error);
				return j.data;
			});
	}

	/* ---------- Toasts ---------- */
	var ICON_OK = '<svg class="wdmcp-i" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
	var ICON_X = '<svg class="wdmcp-i" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
	function toast(msg, isError) {
		var box = $('[data-wdmcp-toasts]');
		if (!box) return;
		var el = document.createElement('div');
		el.className = 'wdmcp-toast' + (isError ? ' wdmcp-toast--error' : '');
		el.innerHTML = (isError ? ICON_X : ICON_OK) + '<span>' + esc(msg) + '</span>';
		box.appendChild(el);
		setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, isError ? 6000 : 3500);
		setTimeout(function () { el.remove(); }, isError ? 6400 : 3900);
	}

	/* ---------- Password show/hide (sign-in) ---------- */
	$$('[data-wdmcp-toggle-pass]').forEach(function (btn) {
		btn.addEventListener('click', function () {
			var input = btn.parentNode.querySelector('input');
			var show = input.type === 'password';
			input.type = show ? 'text' : 'password';
			btn.textContent = show ? 'Hide' : 'Show';
		});
	});

	var app = $('#wdmcp.wdmcp-app');
	if (!app) return;

	/* ---------- Greeting by the visitor's local time ---------- */
	var g = $('[data-wdmcp-greeting]');
	if (g) {
		var h = new Date().getHours();
		g.textContent = h < 12 ? T.morning : h < 18 ? T.afternoon : T.evening;
	}

	/* ---------- Refresh server-rendered sections ---------- */
	function apply(parts) {
		if (!parts) return;
		['requests', 'uploads', 'shared', 'activity'].forEach(function (k) {
			var slot = $('[data-wdmcp-slot="' + k + '"]');
			if (slot && typeof parts[k] === 'string') slot.innerHTML = parts[k];
		});
		if (parts.counts) {
			var n1 = $('[data-wdmcp-n="uploads"]'), n2 = $('[data-wdmcp-n="shared"]');
			if (n1) n1.textContent = parts.counts.uploads;
			if (n2) n2.textContent = parts.counts.shared;
		}
		filter();
	}

	/* ---------- Tabs ---------- */
	function showTab(name, focus) {
		$$('[data-wdmcp-tab]').forEach(function (t) {
			var on = t.getAttribute('data-wdmcp-tab') === name;
			t.setAttribute('aria-selected', on ? 'true' : 'false');
			t.tabIndex = on ? 0 : -1;
			if (on && focus) t.focus();
		});
		$('[data-wdmcp-slot="uploads"]').hidden = name !== 'uploads';
		$('[data-wdmcp-slot="shared"]').hidden = name !== 'shared';
		app.setAttribute('data-tab', name);
		if (name === 'shared') {
			var dot = $('[data-wdmcp-unseen]');
			if (dot && !dot.hidden) { post('seen').catch(function () {}); setTimeout(function () { dot.hidden = true; }, 1500); }
		}
		filter();
	}
	$$('[data-wdmcp-tab]').forEach(function (t, i, all) {
		t.addEventListener('click', function () { showTab(t.getAttribute('data-wdmcp-tab')); });
		t.addEventListener('keydown', function (e) {
			if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
			var next = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
			showTab(next.getAttribute('data-wdmcp-tab'), true);
		});
	});
	showTab(app.getAttribute('data-tab') || 'uploads');

	/* ---------- Search ---------- */
	var search = $('[data-wdmcp-search]');
	function filter() {
		if (!search) return;
		var q = search.value.trim().toLowerCase();
		var panel = $('[data-wdmcp-slot="' + (app.getAttribute('data-tab') || 'uploads') + '"]');
		var rows = $$('.wdmcp-file', panel), shown = 0;
		rows.forEach(function (r) {
			var hit = !q || (r.getAttribute('data-name') || '').indexOf(q) !== -1;
			r.hidden = !hit;
			if (hit) shown++;
		});
		$('[data-wdmcp-noresults]').hidden = !(q && rows.length && !shown);
	}
	if (search) search.addEventListener('input', filter);

	/* ---------- Upload queue ---------- */
	var drop = $('[data-wdmcp-drop]');
	var input = $('[data-wdmcp-input]');
	var queueWrap = $('[data-wdmcp-queue-wrap]');
	var queueEl = $('[data-wdmcp-queue]');
	var sendBtn = $('[data-wdmcp-send]');
	var clearBtn = $('[data-wdmcp-clear]');
	var noteEl = $('[data-wdmcp-note]');
	var forBox = $('[data-wdmcp-for]');
	var queue = [];
	var busy = false;
	var requestId = 0;
	var uid = 0;

	function validate(file) {
		var e = ext(file.name);
		if (C.types && C.types.length && C.types.indexOf(e) === -1) return fmt(T.badType, e || '?');
		if (C.maxBytes && file.size > C.maxBytes) return fmt(T.tooBig, C.maxLabel);
		return '';
	}

	function add(files) {
		Array.prototype.forEach.call(files, function (f) {
			var dup = queue.some(function (q) { return q.file.name === f.name && q.file.size === f.size && q.state !== 'done'; });
			if (dup) return;
			var err = validate(f);
			queue.push({ id: ++uid, file: f, state: err ? 'invalid' : 'ready', error: err, pct: 0 });
		});
		render();
	}

	function render() {
		queue = queue.filter(function (q) { return q.state !== 'done' || busy; });
		queueWrap.hidden = queue.length === 0;
		queueEl.innerHTML = queue.map(function (q) {
			var cls = q.state === 'done' ? ' is-done' : (q.state === 'error' || q.state === 'invalid') ? ' is-error' : '';
			var meta = q.error ? esc(q.error) : size(q.file.size) + (q.state === 'uploading' ? ' · ' + q.pct + '%' : '');
			var action = q.state === 'done'
				? '<span class="wdmcp-q__ok">' + ICON_OK + '</span>'
				: '<button type="button" class="wdmcp-icon-btn" data-remove="' + q.id + '" aria-label="Remove ' + esc(q.file.name) + '"' + (busy ? ' disabled' : '') + '>' + ICON_X + '</button>';
			return '<li class="wdmcp-q' + cls + '">' +
				'<span class="wdmcp-ext wdmcp-ext--' + kind(q.file.name) + '" aria-hidden="true">' + esc((ext(q.file.name) || 'file').slice(0, 4).toUpperCase()) + '</span>' +
				'<div style="min-width:0"><div class="wdmcp-q__name">' + esc(q.file.name) + '</div><div class="wdmcp-q__meta">' + meta + '</div>' +
				(q.state === 'uploading' || q.state === 'done' ? '<div class="wdmcp-q__bar"><span style="width:' + q.pct + '%"></span></div>' : '') +
				'</div>' + action + '</li>';
		}).join('');
		var ready = queue.filter(function (q) { return q.state === 'ready' || q.state === 'error'; }).length;
		sendBtn.disabled = busy || ready === 0;
		clearBtn.disabled = busy;
		sendBtn.textContent = busy ? T.sending : (ready === 1 ? T.send1 : fmt(T.sendN, ready || 0));
	}

	function kind(name) {
		var e = ext(name), map = {
			pdf: 'pdf', jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', heic: 'image', tif: 'image', tiff: 'image',
			psd: 'design', ai: 'design', eps: 'design', indd: 'design', sketch: 'design', fig: 'design',
			doc: 'doc', docx: 'doc', txt: 'doc', rtf: 'doc', odt: 'doc', pages: 'doc',
			xls: 'sheet', xlsx: 'sheet', csv: 'sheet', ods: 'sheet', numbers: 'sheet',
			ppt: 'slides', pptx: 'slides', key: 'slides', zip: 'archive', rar: 'archive', '7z': 'archive',
			mp4: 'video', mov: 'video', m4v: 'video', mp3: 'audio', wav: 'audio', m4a: 'audio'
		};
		return map[e] || 'other';
	}

	queueEl.addEventListener('click', function (e) {
		var b = e.target.closest('[data-remove]');
		if (!b || busy) return;
		var id = +b.getAttribute('data-remove');
		queue = queue.filter(function (q) { return q.id !== id; });
		render();
	});
	clearBtn.addEventListener('click', function () { if (!busy) { queue = []; render(); } });

	drop.addEventListener('click', function (e) {
		if (e.target.closest('[data-wdmcp-types]')) return;
		input.click();
	});
	drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
	input.addEventListener('change', function () { add(input.files); input.value = ''; });
	$('[data-wdmcp-types]').addEventListener('click', function (e) {
		e.stopPropagation();
		var list = $('[data-wdmcp-types-list]');
		list.hidden = !list.hidden;
	});

	// Drag & drop anywhere on the page, highlighted on the drop zone.
	var depth = 0;
	window.addEventListener('dragenter', function (e) { if (hasFiles(e)) { depth++; drop.classList.add('is-over'); } });
	window.addEventListener('dragleave', function () { if (--depth <= 0) { depth = 0; drop.classList.remove('is-over'); } });
	window.addEventListener('dragover', function (e) { if (hasFiles(e)) e.preventDefault(); });
	window.addEventListener('drop', function (e) {
		if (!hasFiles(e)) return;
		e.preventDefault();
		depth = 0; drop.classList.remove('is-over');
		add(e.dataTransfer.files);
		if (!isVisible(drop)) drop.scrollIntoView({ behavior: 'smooth', block: 'center' });
	});
	function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') !== -1; }
	function isVisible(el) { var r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }

	// Paste screenshots straight from the clipboard.
	document.addEventListener('paste', function (e) {
		if (e.target.closest && e.target.closest('input, textarea')) return;
		var items = (e.clipboardData && e.clipboardData.files) || [];
		if (!items.length) return;
		var files = Array.prototype.map.call(items, function (f, i) {
			if (f.name && f.name !== 'image.png') return f;
			var stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
			return new File([f], 'screenshot-' + stamp + (i ? '-' + i : '') + '.png', { type: f.type });
		});
		add(files);
		toast(T.pasted);
	});

	// Link uploads to a request.
	function setRequest(id, title) {
		requestId = id;
		forBox.hidden = !id;
		$('[data-wdmcp-for-title]').textContent = title || '';
	}
	app.addEventListener('click', function (e) {
		var b = e.target.closest('[data-wdmcp-request]');
		if (!b) return;
		setRequest(+b.getAttribute('data-wdmcp-request'), b.getAttribute('data-title'));
		$('#wdmcp-upload').scrollIntoView({ behavior: 'smooth', block: 'start' });
		setTimeout(function () { drop.focus({ preventScroll: true }); }, 400);
	});
	$('[data-wdmcp-for-clear]').addEventListener('click', function () { setRequest(0); });

	function uploadOne(q) {
		return new Promise(function (resolve) {
			var fd = new FormData();
			fd.append('action', 'wdmcp_upload');
			fd.append('nonce', C.nonce);
			fd.append('file', q.file, q.file.name);
			fd.append('note', noteEl.value);
			if (requestId) fd.append('request_id', requestId);
			var xhr = new XMLHttpRequest();
			xhr.open('POST', C.ajax);
			xhr.upload.onprogress = function (e) {
				if (e.lengthComputable) { q.pct = Math.min(99, Math.round(e.loaded / e.total * 100)); render(); }
			};
			xhr.onload = function () {
				var j = null;
				try { j = JSON.parse(xhr.responseText); } catch (err) {}
				if (j && j.success) { q.state = 'done'; q.pct = 100; q.serverId = j.data.id; }
				else {
					q.state = 'error';
					q.error = (j && j.data && j.data.message) || (xhr.status === 413 ? fmt(T.tooBig, C.maxLabel) : T.failed);
				}
				render(); resolve();
			};
			xhr.onerror = function () { q.state = 'error'; q.error = T.failed; render(); resolve(); };
			q.state = 'uploading'; q.error = ''; q.pct = 0; render();
			xhr.send(fd);
		});
	}

	sendBtn.addEventListener('click', function () {
		var todo = queue.filter(function (q) { return q.state === 'ready' || q.state === 'error'; });
		if (!todo.length || busy) return;
		busy = true; render();
		// Upload two at a time: quick, without hammering shared hosting.
		var i = 0;
		function next() {
			if (i >= todo.length) return Promise.resolve();
			var q = todo[i++];
			return uploadOne(q).then(next);
		}
		Promise.all([next(), next()]).then(function () {
			var ok = queue.filter(function (q) { return q.state === 'done'; });
			var ids = ok.map(function (q) { return q.serverId; });
			var failed = queue.some(function (q) { return q.state === 'error'; });
			var finish = ids.length ? post('upload_done', { ids: ids }) : Promise.resolve(null);
			return finish.then(function (parts) {
				busy = false;
				apply(parts);
				queue = queue.filter(function (q) { return q.state !== 'done'; });
				if (!failed) { noteEl.value = ''; setRequest(0); }
				render();
				if (ids.length) {
					showTab('uploads');
					toast(ids.length === 1 ? T.sent1 : fmt(T.sentN, ids.length));
				}
				if (failed) toast(T.someFailed, true);
			});
		}).catch(function (err) { busy = false; render(); toast(err.message || T.error, true); });
	});

	window.addEventListener('beforeunload', function (e) {
		if (busy) { e.preventDefault(); e.returnValue = T.confirmLeave; return T.confirmLeave; }
	});

	/* ---------- Remove own upload ---------- */
	app.addEventListener('click', function (e) {
		var b = e.target.closest('[data-wdmcp-delete]');
		if (!b) return;
		if (!window.confirm(fmt(T.confirmDel, b.getAttribute('data-name')))) return;
		b.disabled = true;
		post('delete', { id: b.getAttribute('data-wdmcp-delete') })
			.then(function (parts) { apply(parts); toast(T.removed); })
			.catch(function (err) { b.disabled = false; toast(err.message, true); });
	});

	/* ---------- Account dialog ---------- */
	var dlg = $('[data-wdmcp-dialog="account"]');
	var form = $('[data-wdmcp-account]');
	$$('[data-wdmcp-open="account"]').forEach(function (b) {
		b.addEventListener('click', function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
	});
	$$('[data-wdmcp-close]', dlg).forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
	dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
	form.addEventListener('submit', function (e) {
		e.preventDefault();
		var errBox = $('[data-wdmcp-account-error]');
		errBox.hidden = true;
		var btn = form.querySelector('[type=submit]');
		btn.disabled = true;
		post('account', new FormData(form)).then(function (d) {
			btn.disabled = false;
			$$('[data-wdmcp-name]').forEach(function (n) { n.textContent = d.name; });
			$$('[data-wdmcp-first]').forEach(function (n) { n.textContent = d.first; });
			form.current_password.value = ''; form.new_password.value = '';
			dlg.close();
			toast(d.message || T.saved);
			if (d.reload) setTimeout(function () { window.location.reload(); }, 1200);
		}).catch(function (err) {
			btn.disabled = false;
			errBox.textContent = err.message; errBox.hidden = false;
		});
	});

	render();
})();
