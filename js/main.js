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
        manageSite: null,    // 台帳フィルタ（null = すべて）
        manageCat: null,
        editingId: null,     // 編集中の備品 id（null = 新規）
        pendingScan: null,   // 保存確認待ち { item, photo, datetime }
        stampTarget: null    // 直前に「済」にした id（押印アニメ用）
    };

    const screens = {
        site:   $('#screen-site'),
        target: $('#screen-target'),
        sheet:  $('#screen-sheet'),
        manage: $('#screen-manage'),
        form:   $('#screen-form')
    };
    const backMap = { target: 'site', sheet: 'target', manage: 'site', form: 'manage' };

    /* ================= 画面遷移 ================= */

    function show(name) {
        state.screen = name;
        Object.entries(screens).forEach(([k, el]) => {
            el.hidden = (k !== name);
            el.dataset.active = String(k === name);
        });
        $('#btn-back').hidden = !(name in backMap);
        $('#btn-manage').hidden = (name === 'manage' || name === 'form');
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
        $('#modal-dialog').hidden = false;
    }
    $('#dialog-ok').addEventListener('click', async () => {
        $('#modal-dialog').hidden = true;
        if (dialogOnOk) await dialogOnOk();
        dialogOnOk = null;
    });
    $('#dialog-cancel').addEventListener('click', () => {
        $('#modal-dialog').hidden = true;
        dialogOnOk = null;
    });

    /* ================= ① 拠点選択 ================= */

    function renderSite() {
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

        const list = $('#sheet-list');
        list.innerHTML = '';
        $('#sheet-empty').hidden = items.length > 0;
        $('#btn-scan').disabled = items.length === 0;

        items.forEach((it, i) => {
            const li = document.createElement('li');
            li.className = 'sheet-row' + (it.checked ? ' is-done' : '');
            li.style.animationDelay = `${Math.min(i * 0.04, 0.4)}s`;
            const justStamped = state.stampTarget === it.id;
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
                    </div>
                    <div class="sheet-row__name">${esc(it.name)}</div>
                    <div class="sheet-row__meta">${esc(it.modelNumber || '型番なし')}・${esc(it.manager || '—')}</div>
                    ${it.checkedAt ? `<div class="sheet-row__time mono">✓ ${esc(it.checkedAt)}</div>` : ''}
                </div>
                <button class="thumb ${it.imageKey ? '' : 'thumb--none'}" type="button"
                        data-id="${esc(it.id)}" ${it.imageKey ? '' : 'disabled'}
                        aria-label="棚卸写真を見る">
                    <img data-imgkey="${esc(it.imageKey || '')}" alt="">
                    <span class="thumb__ph" aria-hidden="true">写真<br>なし</span>
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
                    await Equipment.setChecked(item.id, false);
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
        $('#modal-photo').hidden = false;
    }
    $('#btn-photo-close').addEventListener('click', () => { $('#modal-photo').hidden = true; });

    /* ================= 読み取り =================
     * 実機: IroatoReader（1コード + 自動撮影）
     * デモ: オーバーレイでシミュレート + ダミー写真生成
     */

    $('#btn-scan').addEventListener('click', startScan);

    function startScan() {
        const items = scopeItems();
        if (!items.length) { toast('対象の備品がありません'); return; }

        if (Reader.isReal) {
            Reader.readReal({
                onResult: handleScanResult,
                onError: (err) => dialog({
                    eyebrow: '読み取り',
                    title: '読み取りに失敗しました',
                    body: err.message,
                    okLabel: '閉じる'
                })
            });
        } else {
            startDemoScan(items);
        }
    }

    function handleScanResult({ code, photo, datetime }) {
        const item = Equipment.byCcCode(code);
        if (!item) {
            dialog({
                eyebrow: '読み取り',
                title: `未登録のコードです（No.${code}）`,
                body: 'このコードに紐づく備品が台帳にありません。台帳管理から登録してください。',
                okLabel: '閉じる'
            });
            return;
        }
        if (item.location !== state.site || item.category !== state.category) {
            toast(`注意: ${item.location}・${item.category} の備品です`);
        }
        const dt = datetime || Util.formatDateTime(new Date());
        openConfirm({
            item,
            photo: photo || Reader.makeDemoPhoto(item, dt),
            datetime: dt
        });
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

    function openConfirm({ item, photo, datetime }) {
        state.pendingScan = { item, photo, datetime };
        $('#confirm-photo').src = photo;
        $('#confirm-id').textContent = item.id;
        $('#confirm-name').textContent = item.name;
        $('#confirm-time').textContent = datetime;
        $('#modal-confirm').hidden = false;
    }

    function closeConfirm() {
        $('#modal-confirm').hidden = true;
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
        toast(`${pending.item.id} を「済」として記録しました`);
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

        const items = Equipment.filtered(state.manageSite, state.manageCat);
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

    /* ================= 初期化 ================= */

    $('#mode-tag').textContent = Reader.isReal ? 'IroatoReader 接続' : 'デモモード';
    show('site');
})();
