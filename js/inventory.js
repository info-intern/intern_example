/**
 * inventory.js
 * 棚卸セッション（回）の管理と進捗計算。
 */

const Inventory = (() => {
    let session = Store.loadSession();

    function current() { return session; }

    /**
     * 新しい回を開始する。
     * 回数を +1 し、全備品のチェック・写真をリセットする。
     */
    async function startNewRound() {
        await Equipment.resetChecks();
        session = {
            round: session.round + 1,
            startedAt: Util.formatDateTime(new Date())
        };
        Store.saveSession(session);
        return session;
    }

    /** items のチェック進捗 { done, total, pct } */
    function progress(items) {
        const total = items.length;
        const done = items.filter(it => it.checked).length;
        return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
    }

    return { current, startNewRound, progress };
})();
