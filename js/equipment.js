/**
 * equipment.js
 * 備品マスタの CRUD と管理番号の自動発番。
 * 管理番号 "EQ-0012" の数値部とカメレオンコード番号 "12" は 1:1 対応する。
 */

const Equipment = (() => {
    let list = Store.loadEquipments();

    const LOCATIONS  = ['Aビル5F', 'Aビル6F', '本社', '技術センター'];
    const CATEGORIES = ['社内備品', '建屋鍵', '社員バッジ', '社用車'];
    const STATUSES   = ['使用中', '廃棄予定'];

    function all() { return list; }

    function byId(id) {
        return list.find(it => it.id === id) || null;
    }

    function byCcCode(code) {
        return list.find(it => it.ccCode === String(code)) || null;
    }

    /** 拠点 × 対象区分で絞り込む。null は「すべて」 */
    function filtered(location, category) {
        return list.filter(it =>
            (!location || it.location === location) &&
            (!category || it.category === category)
        );
    }

    /** 既存 id の最大番号 + 1 */
    function nextNumber() {
        const max = list.reduce((m, it) => {
            const n = parseInt(String(it.id).replace(/\D/g, ''), 10);
            return Number.isFinite(n) ? Math.max(m, n) : m;
        }, 0);
        return max + 1;
    }

    /** 新規登録。管理番号・カメレオンコード番号を自動発番して返す */
    function create({ name, modelNumber, manager, location, category, status }) {
        const n = nextNumber();
        const item = {
            id: `EQ-${String(n).padStart(4, '0')}`,
            ccCode: String(n),
            name, modelNumber, manager, location, category, status,
            checked: false,
            checkedAt: null,
            imageKey: null
        };
        list.push(item);
        Store.saveEquipments(list);
        return item;
    }

    function update(id, fields) {
        const item = byId(id);
        if (!item) return null;
        Object.assign(item, fields);
        Store.saveEquipments(list);
        return item;
    }

    /** 削除。紐づく写真も消す */
    async function remove(id) {
        const item = byId(id);
        if (!item) return;
        if (item.imageKey) await Store.deleteImage(item.imageKey);
        list = list.filter(it => it.id !== id);
        Store.saveEquipments(list);
    }

    /** チェック状態の更新。imageKey を渡すと写真も差し替える */
    async function setChecked(id, checked, checkedAt = null, imageKey = undefined) {
        const item = byId(id);
        if (!item) return null;
        item.checked = checked;
        item.checkedAt = checked ? checkedAt : null;
        if (imageKey !== undefined) {
            if (item.imageKey && item.imageKey !== imageKey) {
                await Store.deleteImage(item.imageKey);
            }
            item.imageKey = imageKey;
        }
        Store.saveEquipments(list);
        return item;
    }

    /** 全チェック・写真をリセット（新しい回の開始時） */
    async function resetChecks() {
        await Store.clearImages();
        list.forEach(it => {
            it.checked = false;
            it.checkedAt = null;
            it.imageKey = null;
        });
        Store.saveEquipments(list);
    }

    return {
        LOCATIONS, CATEGORIES, STATUSES,
        all, byId, byCcCode, filtered,
        create, update, remove,
        setChecked, resetChecks
    };
})();
