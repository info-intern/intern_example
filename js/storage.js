/**
 * storage.js
 * 永続化レイヤー。
 * - 備品マスタ / 棚卸セッション … localStorage（JSON）
 * - 写真                       … IndexedDB（DataURL 文字列で保存）
 * IndexedDB が使えない環境ではメモリ上のフォールバックに切り替える
 * （リロードで写真は消えるが、デモは継続できる）。
 */

const Store = (() => {
    // 拠点名の変更などシードを作り直したいときはバージョンを上げる
    // （旧キーのデータは無視され、新シードで再構築される）
    const LS_EQUIPMENTS = 'bihin.v3.equipments';
    const LS_SESSION    = 'bihin.v3.session';

    /* ---------- localStorage ---------- */

    function loadEquipments() {
        try {
            const raw = localStorage.getItem(LS_EQUIPMENTS);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.warn('localStorage 読み込み失敗。シードから再構築します:', e);
        }
        const seed = (window.__SEED_EQUIPMENTS__ || []).map(it => ({ ...it }));
        saveEquipments(seed);
        return seed;
    }

    function saveEquipments(list) {
        try {
            localStorage.setItem(LS_EQUIPMENTS, JSON.stringify(list));
        } catch (e) {
            console.warn('localStorage 保存失敗:', e);
        }
    }

    function loadSession() {
        try {
            const raw = localStorage.getItem(LS_SESSION);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* fall through */ }
        const session = { round: 1, startedAt: Util.formatDateTime(new Date()) };
        saveSession(session);
        return session;
    }

    function saveSession(session) {
        try {
            localStorage.setItem(LS_SESSION, JSON.stringify(session));
        } catch (e) {
            console.warn('localStorage 保存失敗:', e);
        }
    }

    /* ---------- IndexedDB（写真） ---------- */

    const DB_NAME = 'bihin-images';
    const DB_STORE = 'images';
    let dbPromise = null;
    let memoryFallback = null; // IndexedDB 不可時の Map

    function openDb() {
        if (memoryFallback) return Promise.reject(new Error('fallback'));
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore(DB_STORE);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return dbPromise;
    }

    function ensureFallback() {
        if (!memoryFallback) {
            console.warn('IndexedDB が使えないため、写真はメモリ保持に切り替えます');
            memoryFallback = new Map();
        }
        return memoryFallback;
    }

    function withStore(mode, fn) {
        return openDb().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, mode);
            const store = tx.objectStore(DB_STORE);
            const req = fn(store);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        }));
    }

    async function putImage(key, dataUrl) {
        try {
            await withStore('readwrite', s => s.put(dataUrl, key));
        } catch (e) {
            ensureFallback().set(key, dataUrl);
        }
    }

    async function getImage(key) {
        if (!key) return null;
        try {
            const v = await withStore('readonly', s => s.get(key));
            return v || (memoryFallback ? memoryFallback.get(key) : null) || null;
        } catch (e) {
            return memoryFallback ? (memoryFallback.get(key) || null) : null;
        }
    }

    async function deleteImage(key) {
        if (!key) return;
        try {
            await withStore('readwrite', s => s.delete(key));
        } catch (e) { /* ignore */ }
        if (memoryFallback) memoryFallback.delete(key);
    }

    async function clearImages() {
        try {
            await withStore('readwrite', s => s.clear());
        } catch (e) { /* ignore */ }
        if (memoryFallback) memoryFallback.clear();
    }

    return {
        loadEquipments, saveEquipments,
        loadSession, saveSession,
        putImage, getImage, deleteImage, clearImages
    };
})();

/* ---------- 共通ユーティリティ ---------- */

const Util = (() => {
    function pad(n) { return String(n).padStart(2, '0'); }

    /** "2026-06-10 10:30:45" 形式 */
    function formatDateTime(d) {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
               `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    /** "2026.06.10" 形式 */
    function formatDateShort(s) {
        if (!s) return '—';
        return s.slice(0, 10).replace(/-/g, '.');
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }

    return { formatDateTime, formatDateShort, escapeHtml };
})();
