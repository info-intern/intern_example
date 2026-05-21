/**
 * inventory.js
 * 商品マスタと認識結果を突合するロジック。
 */

const Inventory = (() => {

    async function loadMaster(path = 'data/products.json') {
        const res = await fetch(path);
        if (!res.ok) throw new Error('商品マスタの読み込みに失敗しました');
        const json = await res.json();
        return json.products;
    }

    /**
     * 認識結果とマスタを突合する。
     * @param {Array} master      [{ code, name }]
     * @param {Array<string>} recognized 認識されたコード配列（重複可）
     * @returns {{ found: Array, missing: Array, unknown: Array }}
     */
    function diff(master, recognized) {
        const recognizedSet = new Set(recognized.map(String));
        const masterCodes = new Set(master.map(p => p.code));

        const found = [];
        const missing = [];

        master.forEach(p => {
            if (recognizedSet.has(p.code)) {
                found.push(p);
            } else {
                missing.push(p);
            }
        });

        const unknown = Array.from(recognizedSet)
            .filter(c => !masterCodes.has(c))
            .map(c => ({ code: c, name: '(マスタに未登録)' }));

        return { found, missing, unknown };
    }

    return { loadMaster, diff };
})();
