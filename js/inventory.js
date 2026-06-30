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

    /**
     * 今回の棚卸の全体結果サマリを返す。
     * 棚卸の成果物（全体達成率・拠点別集計・未確認＝所在未確認の備品一覧）。
     */
    function summary() {
        const all = Equipment.all();
        const overall = progress(all);
        const pending = all.filter(it => !it.checked);

        // 拠点別の進捗
        const byLocation = Equipment.LOCATIONS.map(loc => ({
            location: loc,
            ...progress(all.filter(it => it.location === loc))
        }));

        // 未確認を拠点 → 区分でグルーピング
        const pendingGroups = Equipment.LOCATIONS.map(loc => ({
            location: loc,
            items: pending.filter(it => it.location === loc)
        })).filter(g => g.items.length > 0);

        return {
            round: session.round,
            startedAt: session.startedAt,
            ...overall,                 // done, total, pct
            pending: pending.length,
            byLocation,
            pendingGroups
        };
    }

    return { current, startNewRound, progress, summary };
})();
