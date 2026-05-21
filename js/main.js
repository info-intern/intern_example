/**
 * main.js
 * 画面遷移・各イベント制御。
 */

(async function () {
    const $ = (s) => document.querySelector(s);
    const screens = {
        home:   $('#screen-home'),
        scan:   $('#screen-scan'),
        result: $('#screen-result')
    };
    const statusTag = $('#status-tag');

    /* ---------- マスタロード ---------- */
    let master = [];
    try {
        master = await Inventory.loadMaster();
    } catch (e) {
        console.error(e);
        alert('商品マスタの読み込みに失敗しました');
        return;
    }

    /* ---------- 画面遷移 ---------- */
    function show(name) {
        Object.entries(screens).forEach(([k, el]) => {
            el.hidden = (k !== name);
            el.dataset.active = String(k === name);
        });
        const labels = {
            home: '待機中',
            scan: '読み取り中',
            result: '結果確認'
        };
        if (statusTag) statusTag.textContent = labels[name] || '';
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    /* ---------- ホーム ---------- */
    $('#btn-start').addEventListener('click', startScan);

    /* ---------- スキャン ---------- */
    let scanHandle = null;
    let scanStartedAt = 0;
    let elapsedTimer = null;
    const detectedCountEl = $('#detected-count');
    const detectedCodesEl = $('#detected-codes');
    const elapsedEl       = $('#hud-elapsed');
    let detectedCount = 0;

    function startScan() {
        show('scan');
        detectedCount = 0;
        detectedCountEl.textContent = '0';
        detectedCodesEl.innerHTML = '';

        scanStartedAt = Date.now();
        updateElapsed();
        elapsedTimer = setInterval(updateElapsed, 200);

        scanHandle = Reader.start({
            master,
            onProgress: (e) => {
                detectedCount++;
                detectedCountEl.textContent = String(detectedCount);
                placeDetectedCode(e);
            },
            onFinish: (codes) => {
                stopElapsed();
                renderResult(codes);
                show('result');
            },
            onError: (err) => {
                stopElapsed();
                alert(err.message);
                show('home');
            }
        });
    }

    function stopElapsed() {
        if (elapsedTimer) {
            clearInterval(elapsedTimer);
            elapsedTimer = null;
        }
    }

    function updateElapsed() {
        const sec = Math.floor((Date.now() - scanStartedAt) / 1000);
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        elapsedEl.textContent = `${m}:${s}`;
    }

    function placeDetectedCode({ code, x, y }) {
        const node = document.createElement('div');
        node.className = 'detected-code';
        node.style.left = `${x}%`;
        node.style.top  = `${y}%`;
        node.textContent = `#${code}`;
        detectedCodesEl.appendChild(node);
        // フェードアウト
        setTimeout(() => {
            node.style.transition = 'opacity 0.6s';
            node.style.opacity = '0';
        }, 800);
        setTimeout(() => node.remove(), 1500);
    }

    $('#btn-finish').addEventListener('click', () => {
        if (scanHandle && scanHandle.finish) scanHandle.finish();
    });

    $('#btn-cancel').addEventListener('click', () => {
        if (scanHandle && scanHandle.cancel) scanHandle.cancel();
        stopElapsed();
        show('home');
    });

    /* ---------- 結果 ---------- */
    let lastDiff = null;
    let currentTab = 'found';

    function renderResult(recognized) {
        const result = Inventory.diff(master, recognized);
        lastDiff = result;

        $('#found-count').textContent   = result.found.length;
        $('#sum-found').textContent     = result.found.length;
        $('#sum-missing').textContent   = result.missing.length;
        $('#sum-unknown').textContent   = result.unknown.length;
        $('#tab-found').textContent     = result.found.length;
        $('#tab-missing').textContent   = result.missing.length;
        $('#tab-unknown').textContent   = result.unknown.length;

        const pct = (result.found.length / master.length) * 100;
        $('#progress-fill').style.width = pct.toFixed(1) + '%';

        const now = new Date();
        $('#result-date').textContent = formatDate(now);

        currentTab = 'found';
        document.querySelectorAll('.tab').forEach(t => {
            t.setAttribute('aria-selected', String(t.dataset.tab === 'found'));
        });
        renderList('found');
    }

    function renderList(tab) {
        const list = $('#product-list');
        list.innerHTML = '';
        if (!lastDiff) return;
        const items = lastDiff[tab];

        if (!items || items.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'product-empty';
            empty.textContent = tab === 'unknown' ? '識別不可のコードはありません'
                : tab === 'missing' ? '無の商品はありません'
                : '有の商品はありません';
            list.appendChild(empty);
            return;
        }

        const statusLabel = { found: '有', missing: '無', unknown: '識別不可' };

        items.forEach((p, i) => {
            const li = document.createElement('li');
            li.className = `product-item product-item--${tab}`;
            li.style.animationDelay = `${Math.min(i * 0.02, 0.5)}s`;
            li.innerHTML = `
                <span class="product-item__code">#${escape(p.code)}</span>
                <span class="product-item__name">${escape(p.name)}</span>
                <span class="product-item__status">
                    <span class="dot dot--${tab}"></span>
                    ${statusLabel[tab]}
                </span>
            `;
            list.appendChild(li);
        });
    }

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const name = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => {
                t.setAttribute('aria-selected', String(t.dataset.tab === name));
            });
            currentTab = name;
            renderList(name);
        });
    });

    $('#btn-restart').addEventListener('click', () => {
        show('home');
    });

    $('#btn-export').addEventListener('click', () => {
        if (!lastDiff) return;
        const rows = [['区分', 'コード', '商品名']];
        lastDiff.found.forEach(p   => rows.push(['確認済み', p.code, p.name]));
        lastDiff.missing.forEach(p => rows.push(['未確認', p.code, p.name]));
        lastDiff.unknown.forEach(p => rows.push(['マスタ外', p.code, p.name]));
        const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tanaoroshi-${formatDateFile(new Date())}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });

    /* ---------- util ---------- */
    function escape(s) {
        return String(s).replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }
    function escapeCsv(v) {
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }
    function pad(n) { return String(n).padStart(2, '0'); }
    function formatDate(d) {
        return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    function formatDateFile(d) {
        return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    }

    /* ---------- 初期表示 ---------- */
    show('home');
})();
