/**
 * reader.js
 * IroatoReader のラッパー。
 * 実機が無い環境では window.IroatoReader が未定義なのでモックを使用する。
 */

const Reader = (() => {
    const isReal = typeof window.IroatoReader !== 'undefined';

    /**
     * 読み取り開始
     * @param {Object} opts
     * @param {Array}    [opts.master]    商品マスタ [{ code, name }]。実機モードで displayData に使用
     * @param {Function} opts.onProgress  認識中のコールバック ({ code, x, y })。モック専用
     * @param {Function} opts.onFinish    完了時のコールバック (codes: string[])
     * @param {Function} opts.onError     エラー時のコールバック
     */
    function start({ master, onProgress, onFinish, onError }) {
        if (isReal) {
            return startReal({ master, onFinish, onError });
        }
        return startMock({ onProgress, onFinish, onError });
    }

    /* ---------- 実機モード ---------- */
    function startReal({ master, onFinish, onError }) {
        const options = {
            mode: window.IroatoReader.multi,
            cameraType: window.IroatoReader.wide,
            resolution: window.IroatoReader.r1920x1080,
            analyzeLevel: 5,
            labelText: '棚全体が画面に収まるように構えてください',
            buttonText: '読み取り完了'
        };

        if (master && master.length) {
            options.displayData = master.reduce((acc, p) => {
                acc[p.code] = p.name;
                return acc;
            }, {});
        }

        const reader = new window.IroatoReader('cc', options);

        reader.read((res) => {
            if (!res || res.status === false) {
                onError && onError(new Error('読み取りに失敗しました'));
                return;
            }
            const codes = (res.data?.codes || []).map(c => String(c.code));
            onFinish && onFinish(codes);
        });

        // 実機モードは IroatoReader が画面を占有するため、cancel/finish は不要だが
        // 呼び出し側との互換性のため no-op を返す
        return {
            finish() {},
            cancel() {}
        };
    }

    /* ---------- モックモード ---------- */
    let mockTimer = null;
    const mockState = { active: false, recognized: new Set() };

    function startMock({ onProgress, onFinish, onError }) {
        mockState.active = true;
        mockState.recognized.clear();

        // 1〜100 のうちランダムに 80〜95 件「認識」させる
        const total = 100;
        const willRecognize = Math.floor(Math.random() * 16) + 80; // 80..95
        const pool = Array.from({ length: total }, (_, i) => String(i + 1));
        shuffle(pool);
        const targets = pool.slice(0, willRecognize);
        // たまにマスタ外コードを混ぜる（101以上）
        if (Math.random() > 0.4) {
            targets.push(String(150 + Math.floor(Math.random() * 10)));
        }

        let idx = 0;
        const interval = 120;

        mockTimer = setInterval(() => {
            if (!mockState.active) return;
            if (idx >= targets.length) {
                return;
            }
            const code = targets[idx++];
            mockState.recognized.add(code);
            onProgress && onProgress({
                code,
                // ビューファインダ内のランダム座標 (%)
                x: 10 + Math.random() * 80,
                y: 10 + Math.random() * 80
            });
        }, interval);

        return {
            finish() {
                if (!mockState.active) return;
                mockState.active = false;
                clearInterval(mockTimer);
                mockTimer = null;
                const codes = Array.from(mockState.recognized);
                onFinish && onFinish(codes);
            },
            cancel() {
                mockState.active = false;
                clearInterval(mockTimer);
                mockTimer = null;
            }
        };
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    return { start, isMock: !isReal };
})();
