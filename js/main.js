/**
 * main.js
 * 画面遷移・描画・イベント制御。
 *
 * 画面構成:
 *   site   … ① 拠点選択
 *   target … ② 対象選択
 *   sheet  … ③ 棚卸実施
 *   manage … 台帳管理（一覧）
 *   form   … 新規登録 / 編集
 */

(function () {
    const $ = (s) => document.querySelector(s);
    const esc = Util.escapeHtml;

    /* ================= 状態 ================= */

    const state = {
        screen: 'site',
        site: null,          // 棚卸フローで選択中の拠点
        category: null,      // 棚卸フローで選択中の対象区分
        sheetFilter: 'all',  // 実施画面の表示フィルタ all | undone | done
        manageSite: null,    // 台帳フィルタ（null = すべて）
        manageCat: null,
        manageQuery: '',     // 台帳のテキスト検索
        editingId: null,     // 編集中の備品 id（null = 新規）
        pendingScan: null,   // 保存確認待ち { item, photo, datetime }
        stampTarget: null    // 直前に「済」にした id（押印アニメ用）
    };

    const screens = {
        site:   $('#screen-site'),
        target: $('#screen-target'),
        sheet:  $('#screen-sheet'),
        manage: $('#screen-manage'),
        form:   $('#screen-form'),
        result: $('#screen-result')
    };
    const backMap = { target: 'site', sheet: 'target', manage: 'site', form: 'manage', result: 'site' };

    /* ================= 画面遷移 ================= */

    function show(name) {
        state.screen = name;
        Object.entries(screens).forEach(([k, el]) => {
            el.hidden = (k !== name);
            el.dataset.active = String(k === name);
        });
        $('#btn-back').hidden = !(name in backMap);
        $('#btn-manage').hidden = (name === 'manage' || name === 'form' || name === 'result');
        render(name);
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    function render(name) {
        renderRoundChip();
        if (name === 'site')   renderSite();
        if (name === 'target') renderTarget();
        if (name === 'sheet')  renderSheet();
        if (name === 'manage') renderManage();
        if (name === 'form')   renderForm();
        if (name === 'result') renderResult();
    }

    $('#btn-back').addEventListener('click', () => {
        const to = backMap[state.screen];
        if (to) show(to);
    });

    $('#btn-manage').addEventListener('click', () => show('manage'));

    /* ================= 共通パーツ ================= */

    function renderRoundChip() {
        $('#round-chip').textContent = `第${Inventory.current().round}回`;
    }

    function statusPill(item) {
        const cls = item.status === '廃棄予定' ? 'pill--discard' : 'pill--use';
        return `<span class="pill ${cls}">${esc(item.status)}</span>`;
    }

    /* ---------- トースト ---------- */
    let toastTimer = null;
    function toast(msg) {
        const el = $('#toast');
        el.textContent = msg;
        el.hidden = false;
        el.classList.remove('is-show');
        void el.offsetWidth; // アニメ再生のためリフロー
        el.classList.add('is-show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
    }

    /* ---------- 汎用ダイアログ ---------- */
    let dialogOnOk = null;
    function dialog({ eyebrow = '確認', title, body, okLabel = 'OK', danger = false, onOk }) {
        $('#dialog-eyebrow').textContent = eyebrow;
        $('#dialog-title').textContent = title;
        $('#dialog-body').textContent = body;
        const okBtn = $('#dialog-ok');
        okBtn.querySelector('.cta__label').textContent = okLabel;
        okBtn.classList.toggle('cta--danger', danger);
        dialogOnOk = onOk || null;
        openModal($('#modal-dialog'));
    }
    $('#dialog-ok').addEventListener('click', async () => {
        closeModal($('#modal-dialog'));
        if (dialogOnOk) await dialogOnOk();
        dialogOnOk = null;
    });
    $('#dialog-cancel').addEventListener('click', () => {
        closeModal($('#modal-dialog'));
        dialogOnOk = null;
    });

    /* ================= ① 拠点選択 ================= */

    function renderOverallSummary() {
        const s = Inventory.summary();
        $('#overall-summary').innerHTML = `
            <div class="summary__top">
                <span class="summary__label">第${s.round}回 全体の進捗</span>
                <span class="summary__pct"><b>${s.pct}</b>%</span>
            </div>
            <div class="summary__bar"><div class="summary__fill" style="width:${s.pct}%"></div></div>
            <div class="summary__foot">
                <span class="summary__nums"><b>${s.done}</b> / ${s.total} 点 確認済</span>
                <button class="ghost-btn ghost-btn--small" id="btn-view-result" type="button">結果を見る →</button>
            </div>`;
        $('#btn-view-result').addEventListener('click', () => show('result'));
    }

    function renderSite() {
        renderOverallSummary();
        const session = Inventory.current();
        $('#round-num').textContent = `第${session.round}回`;
        $('#round-date').textContent = `${Util.formatDateShort(session.startedAt)} 開始`;

        const list = $('#site-list');
        list.innerHTML = '';
        Equipment.LOCATIONS.forEach((loc, i) => {
            const items = Equipment.filtered(loc, null);
            const p = Inventory.progress(items);
            const li = document.createElement('li');
            li.innerHTML = `
                <button class="choice" type="button" data-site="${esc(loc)}" style="animation-delay:${i * 0.05}s">
                    <span class="choice__num">${String(i + 1).padStart(2, '0')}</span>
                    <span class="choice__body">
                        <span class="choice__name">${esc(loc)}</span>
                        <span class="choice__meta mono">${p.done} / ${p.total} 済</span>
                    </span>
                    <span class="choice__gauge"><span style="width:${p.pct}%"></span></span>
                    <span class="choice__arrow" aria-hidden="true">→</span>
                </button>`;
            list.appendChild(li);
        });
        list.querySelectorAll('.choice').forEach(btn => {
            btn.addEventListener('click', () => {
                state.site = btn.dataset.site;
                show('target');
            });
        });
    }

    $('#btn-new-round').addEventListener('click', () => {
        const next = Inventory.current().round + 1;
        dialog({
            eyebrow: '棚卸セッション',
            title: `第${next}回を開始しますか？`,
            body: 'すべての備品のチェックと棚卸写真がリセットされます。この操作は取り消せません。',
            okLabel: `第${next}回を開始`,
            danger: true,
            onOk: async () => {
                await Inventory.startNewRound();
                renderRoundChip();
                renderSite();
                toast(`第${next}回の棚卸を開始しました`);
            }
        });
    });

    /* ================= ② 対象選択 ================= */

    function renderTarget() {
        $('#target-site').textContent = state.site || '—';
        const list = $('#target-list');
        list.innerHTML = '';
        Equipment.CATEGORIES.forEach((cat, i) => {
            const items = Equipment.filtered(state.site, cat);
            const p = Inventory.progress(items);
            const li = document.createElement('li');
            li.innerHTML = `
                <button class="choice" type="button" data-cat="${esc(cat)}" style="animation-delay:${i * 0.05}s">
                    <span class="choice__num">${String(i + 1).padStart(2, '0')}</span>
                    <span class="choice__body">
                        <span class="choice__name">${esc(cat)}</span>
                        <span class="choice__meta mono">${p.done} / ${p.total} 済</span>
                    </span>
                    <span class="choice__gauge"><span style="width:${p.pct}%"></span></span>
                    <span class="choice__arrow" aria-hidden="true">→</span>
                </button>`;
            list.appendChild(li);
        });
        list.querySelectorAll('.choice').forEach(btn => {
            btn.addEventListener('click', () => {
                state.category = btn.dataset.cat;
                show('sheet');
            });
        });
    }

    /* ================= ③ 棚卸実施 ================= */

    function scopeItems() {
        return Equipment.filtered(state.site, state.category);
    }

    function renderSheet() {
        $('#sheet-title').textContent = `${state.site} — ${state.category}`;
        const items = scopeItems();
        const p = Inventory.progress(items);
        $('#sheet-done').textContent = p.done;
        $('#sheet-total').textContent = p.total;
        $('#sheet-fill').style.width = p.pct + '%';

        // フィルタ表示（進捗はスコープ全体、表示だけ絞る）
        const visible = items.filter(it =>
            state.sheetFilter === 'undone' ? !it.checked :
            state.sheetFilter === 'done'   ? it.checked  : true
        );

        const list = $('#sheet-list');
        list.innerHTML = '';
        const emptyNote = $('#sheet-empty');
        if (items.length === 0) {
            emptyNote.textContent = 'この拠点・対象に登録された備品はありません。';
            emptyNote.hidden = false;
        } else if (visible.length === 0) {
            emptyNote.textContent = state.sheetFilter === 'undone'
                ? 'すべて確認済みです。' : '確認済みの備品はまだありません。';
            emptyNote.hidden = false;
        } else {
            emptyNote.hidden = true;
        }
        $('#btn-scan').disabled = items.length === 0;

        visible.forEach((it, i) => {
            const li = document.createElement('li');
            li.className = 'sheet-row' + (it.checked ? ' is-done' : '');
            li.style.animationDelay = `${Math.min(i * 0.04, 0.4)}s`;
            const justStamped = state.stampTarget === it.id;
            const manual = it.checked && !it.imageKey;
            li.innerHTML = `
                <button class="stamp ${it.checked ? 'stamp--done' : ''} ${justStamped ? 'is-stamping' : ''}"
                        type="button" data-id="${esc(it.id)}"
                        aria-label="${it.checked ? '済を取り消す' : '済にする'}">
                    <span class="stamp__char">${it.checked ? '済' : '未'}</span>
                </button>
                <div class="sheet-row__body">
                    <div class="sheet-row__line1">
                        <span class="sheet-row__id mono">${esc(it.id)}</span>
                        ${statusPill(it)}
                        ${manual ? '<span class="pill pill--manual">手動</span>' : ''}
                    </div>
                    <div class="sheet-row__name">${esc(it.name)}</div>
                    <div class="sheet-row__meta">${esc(it.modelNumber || '型番なし')}・${esc(it.manager || '—')}</div>
                    ${it.checkedAt ? `<div class="sheet-row__time mono">✓ ${esc(it.checkedAt)}</div>` : ''}
                </div>
                <button class="thumb ${it.imageKey ? '' : 'thumb--none'}" type="button"
                        data-id="${esc(it.id)}" ${it.imageKey ? '' : 'disabled'}
                        aria-label="${it.imageKey ? '棚卸写真を見る' : '写真なし'}">
                    <img data-imgkey="${esc(it.imageKey || '')}" alt="">
                    <span class="thumb__ph" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10.5" r="1.6"/><path d="M21 16l-4.5-4.5L7 21"/></svg>
                    </span>
                </button>`;
            list.appendChild(li);
        });
        state.stampTarget = null;

        // 印タップ → 手動チェック切り替え
        list.querySelectorAll('.stamp').forEach(btn => {
            btn.addEventListener('click', async () => {
                const item = Equipment.byId(btn.dataset.id);
                if (!item) return;
                if (item.checked) {
                    await Equipment.setChecked(item.id, false, null, null);
                    toast(`${item.id} の「済」を取り消しました`);
                } else {
                    await Equipment.setChecked(item.id, true, Util.formatDateTime(new Date()));
                    state.stampTarget = item.id;
                }
                renderSheet();
            });
        });

        // サムネイルタップ → 写真ビューア
        list.querySelectorAll('.thumb:not(.thumb--none)').forEach(btn => {
            btn.addEventListener('click', () => openPhotoViewer(btn.dataset.id));
        });

        // サムネイル画像を非同期ロード
        list.querySelectorAll('.thumb img[data-imgkey]').forEach(async img => {
            const key = img.dataset.imgkey;
            if (!key) return;
            const dataUrl = await Store.getImage(key);
            if (dataUrl) {
                img.src = dataUrl;
                img.closest('.thumb').classList.add('has-img');
            }
        });
    }

    async function openPhotoViewer(id) {
        const item = Equipment.byId(id);
        if (!item || !item.imageKey) return;
        const dataUrl = await Store.getImage(item.imageKey);
        if (!dataUrl) { toast('写真を読み込めませんでした'); return; }
        $('#view-photo').src = dataUrl;
        $('#view-id').textContent = item.id;
        $('#view-name').textContent = item.name;
        $('#view-time').textContent = item.checkedAt || '—';
        openModal($('#modal-photo'));
    }
    $('#btn-photo-close').addEventListener('click', () => { closeModal($('#modal-photo')); });

    /* ================= 読み取り =================
     * 実機: IroatoReader（1コード + 自動撮影）
     * デモ: オーバーレイでシミュレート + ダミー写真生成
     */

    $('#btn-scan').addEventListener('click', startScan);

    // 未/済フィルタ（1度だけバインド。状態を変えて再描画）
    $('#sheet-filter').addEventListener('click', (e) => {
        const btn = e.target.closest('.toggle__btn');
        if (!btn) return;
        state.sheetFilter = btn.dataset.filter;
        $('#sheet-filter').querySelectorAll('.toggle__btn').forEach(b =>
            b.classList.toggle('is-on', b === btn));
        renderSheet();
    });

    function startScan() {
        const items = scopeItems();
        if (!items.length) { toast('対象の備品がありません'); return; }

        if (Reader.isReal) {
            Reader.readReal({
                onResult: handleScanResult,
                onError: (err) => {
                    dialog({
                        eyebrow: '読み取り',
                        title: '読み取りに失敗しました',
                        body: err.message,
                        okLabel: '閉じる'
                    });
                }
            });
        } else {
            startDemoScan(items);
        }
    }

    function handleScanResult({ code, photo, datetime, debug }) {
        const item = Equipment.byCcCode(code);
        if (!item) {
            dialog({
                eyebrow: '読み取り',
                title: `未登録のコードです（No.${code}）`,
                body: 'このコードに紐づく備品が台帳にありません。台帳管理から登録してください。'
                    + (debug ? `\n\n[診断] リーダー出力: ${debug}` : ''),
                okLabel: '閉じる'
            });
            return;
        }
        const dt = datetime || Util.formatDateTime(new Date());
        const proceed = () => { openConfirm({
            item,
            photo: photo || Reader.makeDemoPhoto(item, dt),
            datetime: dt
        }); };

        // 取り違え防止：選択中の拠点・対象と異なる備品は確認してから記録
        if (item.location !== state.site || item.category !== state.category) {
            dialog({
                eyebrow: '取り違えの確認',
                title: '別の対象の備品です',
                body: `読み取った備品は「${item.location}・${item.category}」です。`
                    + `いま棚卸中の「${state.site}・${state.category}」ではありません。`
                    + `それでもこの備品を記録しますか？`,
                okLabel: 'この備品を記録する',
                onOk: proceed
            });
            return;
        }
        proceed();
    }

    /* ---------- デモ読み取りオーバーレイ ---------- */
    let demoTimer = null;

    function startDemoScan(items) {
        $('#scan-overlay').hidden = false;
        $('#vf-hit').hidden = true;

        demoTimer = setTimeout(() => {
            const target = Reader.pickDemoTarget(items);
            if (!target) { closeDemoScan(); return; }
            // 認識エフェクト
            $('#vf-hit-code').textContent = `No.${target.ccCode}`;
            $('#vf-hit').hidden = false;
            demoTimer = setTimeout(() => {
                closeDemoScan();
                const dt = Util.formatDateTime(new Date());
                openConfirm({
                    item: target,
                    photo: Reader.makeDemoPhoto(target, dt),
                    datetime: dt
                });
            }, 900);
        }, 1400 + Math.random() * 800);
    }

    function closeDemoScan() {
        clearTimeout(demoTimer);
        demoTimer = null;
        $('#scan-overlay').hidden = true;
    }

    $('#btn-scan-cancel').addEventListener('click', closeDemoScan);

    /* ---------- 撮影確認ダイアログ ---------- */

    /* ---------- モーダル表示の共通制御 ----------
     * IroatoReader（iOS WKWebView）対策が2点ある：
     *  (1) 重なり: position:fixed のモーダルが .app(position:relative) の下に誤って
     *      合成描画される（z-index でも translateZ でも勝てない）。表示中だけ .app の
     *      描画を止めて確実に最前面へ出す。
     *  (2) 再描画: カメラから復帰した直後は DOM を変えても WebView が画面を描き直さない
     *      ことがある。明示的に再描画を促す。
     * 全モーダルはこの openModal / closeModal を必ず通す。
     */
    function shieldApp(hide) {
        const app = document.querySelector('.app');
        if (app) app.style.display = hide ? 'none' : '';
    }
    function kickRepaint() {
        const de = document.documentElement;
        de.style.transform = 'translateZ(0)';
        void de.offsetWidth;           // 強制リフロー
        de.style.transform = '';
        window.scrollBy(0, 1); window.scrollBy(0, -1);
    }
    function openModal(m) {
        shieldApp(true);
        m.hidden = false;
        kickRepaint();
        setTimeout(kickRepaint, 300);  // カメラ復帰直後の描画遅延に備えた保険
    }
    function closeModal(m) {
        m.hidden = true;
        // 他に開いているモーダルが無ければアプリ表示を戻す
        if (!document.querySelector('.modal:not([hidden])')) shieldApp(false);
    }

    function openConfirm({ item, photo, datetime }) {
        state.pendingScan = { item, photo, datetime };
        $('#confirm-photo').src = photo || '';
        $('#confirm-id').textContent = item.id;
        $('#confirm-name').textContent = item.name;
        $('#confirm-time').textContent = datetime;
        openModal($('#modal-confirm'));
    }

    function closeConfirm() {
        closeModal($('#modal-confirm'));
        state.pendingScan = null;
    }

    $('#btn-confirm-save').addEventListener('click', async () => {
        const pending = state.pendingScan;
        if (!pending) return;
        const key = `img-${pending.item.id}-${Date.now()}`;
        await Store.putImage(key, pending.photo);
        await Equipment.setChecked(pending.item.id, true, pending.datetime, key);
        state.stampTarget = pending.item.id;
        closeConfirm();
        const remaining = scopeItems().filter(it => !it.checked).length;
        toast(remaining > 0
            ? `${pending.item.id} を記録しました（残り ${remaining} 件）`
            : `${pending.item.id} を記録しました。この対象は完了です`);
        if (state.screen === 'sheet') renderSheet();
    });

    $('#btn-confirm-retry').addEventListener('click', () => {
        closeConfirm();
        startScan();
    });

    $('#btn-confirm-cancel').addEventListener('click', closeConfirm);

    /* ================= 台帳管理 ================= */

    function renderManage() {
        renderFilterRow($('#filter-site'), ['すべての拠点', ...Equipment.LOCATIONS], state.manageSite, v => {
            state.manageSite = v;
            renderManage();
        });
        renderFilterRow($('#filter-cat'), ['すべての区分', ...Equipment.CATEGORIES], state.manageCat, v => {
            state.manageCat = v;
            renderManage();
        });

        let items = Equipment.filtered(state.manageSite, state.manageCat);
        const q = state.manageQuery.trim().toLowerCase();
        if (q) {
            items = items.filter(it =>
                it.name.toLowerCase().includes(q) ||
                it.id.toLowerCase().includes(q) ||
                String(it.ccCode).includes(q)
            );
        }
        $('#manage-count').textContent = items.length;
        $('#manage-empty').hidden = items.length > 0;

        const list = $('#manage-list');
        list.innerHTML = '';
        items.forEach((it, i) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <button class="manage-row" type="button" data-id="${esc(it.id)}" style="animation-delay:${Math.min(i * 0.03, 0.3)}s">
                    <div class="manage-row__line1">
                        <span class="sheet-row__id mono">${esc(it.id)}</span>
                        <span class="manage-row__cc mono">CC No.${esc(it.ccCode)}</span>
                        ${statusPill(it)}
                    </div>
                    <div class="sheet-row__name">${esc(it.name)}</div>
                    <div class="sheet-row__meta">${esc(it.location)}・${esc(it.category)}・${esc(it.manager || '—')}</div>
                </button>`;
            list.appendChild(li);
        });
        list.querySelectorAll('.manage-row').forEach(btn => {
            btn.addEventListener('click', () => {
                state.editingId = btn.dataset.id;
                show('form');
            });
        });
    }

    function renderFilterRow(container, labels, selected, onSelect) {
        container.innerHTML = '';
        labels.forEach((label, i) => {
            const value = i === 0 ? null : label;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chip' + ((selected === value) ? ' is-on' : '');
            btn.textContent = label;
            btn.addEventListener('click', () => onSelect(value));
            container.appendChild(btn);
        });
    }

    $('#btn-add').addEventListener('click', () => {
        state.editingId = null;
        show('form');
    });

    // 台帳検索（入力のたびに再描画。一覧だけ更新し検索欄はフォーカス維持）
    $('#manage-search').addEventListener('input', (e) => {
        state.manageQuery = e.target.value;
        renderManage();
    });

    /* ================= 登録 / 編集フォーム ================= */

    function fillSelect(sel, options) {
        sel.innerHTML = '';
        options.forEach(v => {
            const op = document.createElement('option');
            op.value = v;
            op.textContent = v;
            sel.appendChild(op);
        });
    }

    let formStatus = '使用中';

    function renderStatusSeg() {
        const seg = $('#f-status');
        seg.innerHTML = '';
        Equipment.STATUSES.forEach(st => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'seg__btn' + (formStatus === st ? ' is-on' : '');
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-checked', String(formStatus === st));
            btn.textContent = st;
            btn.addEventListener('click', () => {
                formStatus = st;
                renderStatusSeg();
            });
            seg.appendChild(btn);
        });
    }

    function renderForm() {
        fillSelect($('#f-location'), Equipment.LOCATIONS);
        fillSelect($('#f-category'), Equipment.CATEGORIES);

        const editing = state.editingId ? Equipment.byId(state.editingId) : null;
        $('#form-eyebrow').textContent = editing ? '台帳管理 — 編集' : '台帳管理 — 新規登録';
        $('#form-title').textContent = editing ? '備品を編集' : '備品を登録';
        $('#form-note').hidden = !!editing;
        $('#form-id-row').hidden = !editing;
        $('#btn-delete').hidden = !editing;

        if (editing) {
            $('#form-id').textContent = `${editing.id}（CC No.${editing.ccCode}）`;
            $('#f-name').value = editing.name;
            $('#f-model').value = editing.modelNumber || '';
            $('#f-manager').value = editing.manager || '';
            $('#f-location').value = editing.location;
            $('#f-category').value = editing.category;
            formStatus = editing.status;
        } else {
            $('#f-name').value = '';
            $('#f-model').value = '';
            $('#f-manager').value = '';
            $('#f-location').value = state.manageSite || Equipment.LOCATIONS[0];
            $('#f-category').value = state.manageCat || Equipment.CATEGORIES[0];
            formStatus = '使用中';
        }
        renderStatusSeg();
    }

    $('#equip-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#f-name').value.trim();
        if (!name) {
            toast('商品名を入力してください');
            $('#f-name').focus();
            return;
        }
        const fields = {
            name,
            modelNumber: $('#f-model').value.trim(),
            manager: $('#f-manager').value.trim(),
            location: $('#f-location').value,
            category: $('#f-category').value,
            status: formStatus
        };

        if (state.editingId) {
            Equipment.update(state.editingId, fields);
            toast('変更を保存しました');
            show('manage');
        } else {
            const created = Equipment.create(fields);
            if (!created) {
                dialog({
                    eyebrow: '新規登録',
                    title: 'カメレオンコードに空きがありません',
                    body: 'カメレオンコード（1〜100）がすべて使用中です。不要な備品を削除してから登録してください。',
                    okLabel: '閉じる'
                });
                return;
            }
            show('manage');
            dialog({
                eyebrow: '新規登録',
                title: `${created.id} を発行しました`,
                body: `カメレオンコード No.${created.ccCode} と紐づけました。対応するコードラベルを現物に貼付してください。`,
                okLabel: 'OK'
            });
        }
    });

    $('#btn-delete').addEventListener('click', () => {
        const item = Equipment.byId(state.editingId);
        if (!item) return;
        dialog({
            eyebrow: '台帳管理',
            title: `${item.id} を削除しますか？`,
            body: `「${item.name}」を台帳から削除します。紐づく棚卸写真も削除されます。この操作は取り消せません。`,
            okLabel: '削除する',
            danger: true,
            onOk: async () => {
                await Equipment.remove(item.id);
                state.editingId = null;
                toast('削除しました');
                show('manage');
            }
        });
    });

    /* ================= 棚卸結果 ================= */

    function renderResult() {
        const s = Inventory.summary();
        $('#result-round').textContent = `第${s.round}回`;

        const breakdown = s.byLocation.map(b => {
            const complete = b.total > 0 && b.done === b.total;
            return `
                <div class="bd-row">
                    <span class="bd-row__name">${esc(b.location)}</span>
                    <span class="bd-row__nums mono">${b.done} / ${b.total}</span>
                    <div class="bd-row__bar"><div class="bd-row__fill ${complete ? 'is-complete' : ''}" style="width:${b.pct}%"></div></div>
                </div>`;
        }).join('');

        let pendingHtml;
        if (s.pending === 0) {
            pendingHtml = `<div class="result-alldone">✓ すべての備品の所在を確認しました</div>`;
        } else {
            pendingHtml = s.pendingGroups.map(g => `
                <div class="miss-group">
                    <div class="miss-group__head">${esc(g.location)}（${g.items.length}件）</div>
                    <ul class="miss-list">
                        ${g.items.map(it => `
                            <li class="miss-item">
                                <span class="miss-item__id">${esc(it.id)}</span>
                                <span class="miss-item__name">${esc(it.name)}</span>
                                <span class="miss-item__meta">${esc(it.category)}</span>
                            </li>`).join('')}
                    </ul>
                </div>`).join('');
        }

        $('#result-body').innerHTML = `
            <div class="result-hero">
                <div class="result-hero__pct">${s.pct}<span>%</span></div>
                <div class="result-hero__nums"><b>${s.done}</b> / ${s.total} 点 確認済 ・ 未確認 <b>${s.pending}</b> 件</div>
                <div class="result-hero__bar"><div class="result-hero__fill" style="width:${s.pct}%"></div></div>
            </div>
            <section class="result-section">
                <div class="result-section__title">拠点別の進捗</div>
                ${breakdown}
            </section>
            <section class="result-section">
                <div class="result-section__title">未確認（所在未確認）<span class="result-section__count">${s.pending} 件</span></div>
                ${pendingHtml}
            </section>`;
    }

    /** クリップボード用の結果テキスト（未確認リストが主役） */
    function buildResultText() {
        const s = Inventory.summary();
        const lines = [];
        lines.push(`■ 備品棚卸 結果（第${s.round}回）`);
        lines.push(`確認済 ${s.done} / 全 ${s.total} 件（${s.pct}%）／ 未確認 ${s.pending} 件`);
        lines.push('');
        if (s.pending === 0) {
            lines.push('未確認の備品はありません。すべて確認済みです。');
        } else {
            lines.push('【未確認（所在未確認）の備品】');
            s.pendingGroups.forEach(g => {
                lines.push(`◇ ${g.location}`);
                g.items.forEach(it => lines.push(`  - ${it.id} ${it.name}（${it.category}）`));
            });
        }
        return lines.join('\n');
    }

    async function copyResult() {
        const text = buildResultText();
        try {
            await navigator.clipboard.writeText(text);
            toast('結果をコピーしました');
            return;
        } catch (e) { /* クリップボードAPI不可 → フォールバック */ }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); toast('結果をコピーしました'); }
        catch (_) { toast('コピーできませんでした'); }
        document.body.removeChild(ta);
    }

    $('#btn-result-copy').addEventListener('click', copyResult);
    $('#btn-result-back').addEventListener('click', () => show(backMap.result));

    /* ================= 初期化 ================= */

    $('#mode-tag').textContent = Reader.isReal ? 'IroatoReader 接続' : 'デモモード';
    show('site');
})();
