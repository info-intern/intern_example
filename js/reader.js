/**
 * reader.js
 * カメレオンコード読み取りレイヤー。
 * - 実機（IroatoReader あり）… 1コード読み取り + 自動撮影（returnImage）
 * - デモモード（PC ブラウザ等）… 読み取りをシミュレートし、ダミー写真を生成
 */

const Reader = (() => {
    const isReal = typeof window.IroatoReader !== 'undefined';

    /** 診断用：オブジェクトを短いJSON文字列にする */
    function peek(obj) {
        try { return JSON.stringify(obj).slice(0, 300); }
        catch (_) { return String(obj); }
    }

    /**
     * 実機で1コード読み取る。
     * @param {Function} onResult ({ code, photo, datetime }) photo は DataURL または null
     * @param {Function} onError  (Error)
     */
    function readReal({ onResult, onError }) {
        // カメラ認識時にコード番号ではなく「紐づく商品名」を表示する。
        // displayData は { "<コード番号>": "<表示文字列>" } 形式（リファレンス準拠）。
        // 台帳(Equipment)の ccCode→name で対応表を作る。
        const displayData = {};
        try {
            const allItems = (typeof Equipment !== 'undefined' && Equipment.all) ? Equipment.all() : [];
            allItems.forEach((it) => {
                if (it && it.ccCode != null) displayData[String(it.ccCode)] = it.name;
            });
        } catch (_) { /* displayData が作れなくても読み取り自体は続行する */ }

        // リファレンス(Ver.1.4.0): read(<オプション>, <コールバック>)。オプションは
        // コンストラクタと read の両方が同形式を受け付けるため使い回す。
        const options = {
            mode: window.IroatoReader.single,
            cameraType: window.IroatoReader.wide,
            resolution: window.IroatoReader.r1920x1080,
            analyzeLevel: 5,
            returnImage: true,
            imageWidth: 640,
            displayData: displayData,   // ← 認識時にコード番号ではなく商品名を表示
            labelText: 'カメレオンコードを枠内に収めてください',
            buttonText: '読み取り'
        };

        let reader;
        try {
            reader = new window.IroatoReader('cc', options);
        } catch (err) {
            onError && onError(err instanceof Error ? err : new Error(String(err)));
            return;
        }

        try {
            reader.read(options, (res) => {
                try {
                    if (!res || res.status === false) {
                        onError && onError(new Error('読み取りに失敗しました'));
                        return;
                    }
                    // res.data.codes[0].code がコードの値（リファレンス準拠）
                    const first = (res.data && res.data.codes && res.data.codes[0]) || null;
                    if (!first || first.code == null) {
                        onError && onError(new Error(
                            'コードを認識できませんでした。\nリーダー出力: ' + peek(res.data || res)
                        ));
                        return;
                    }

                    // 写真（returnImage:true のとき images に Base64 が入る）
                    let photo = null;
                    const rawImg = (first.imageKey && res.data.images) ? res.data.images[first.imageKey] : null;
                    if (rawImg) {
                        photo = String(rawImg).startsWith('data:') ? rawImg : `data:image/jpeg;base64,${rawImg}`;
                    }

                    onResult && onResult({
                        // 値の型・桁ゆれ（数値/文字列/ゼロ埋め）は Equipment.byCcCode 側で吸収する
                        code: String(first.code).trim(),
                        photo,
                        datetime: first.datetime || Util.formatDateTime(new Date()),
                        debug: peek(first)   // 台帳に紐づかなかったときの診断用
                    });
                } catch (err) {
                    onError && onError(err instanceof Error ? err : new Error(String(err)));
                }
            });
        } catch (err) {
            onError && onError(err instanceof Error ? err : new Error(String(err)));
        }
    }

    /**
     * デモ用：スコープ内からターゲットを1件選ぶ（未チェック優先）。
     */
    function pickDemoTarget(scopeItems) {
        const unchecked = scopeItems.filter(it => !it.checked);
        const pool = unchecked.length ? unchecked : scopeItems;
        return pool[Math.floor(Math.random() * pool.length)] || null;
    }

    /**
     * デモ用：自動撮影された風のダミー写真を Canvas で生成する。
     * @returns {string} DataURL
     */
    function makeDemoPhoto(item, datetime) {
        const w = 640, h = 480;
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');

        // 背景（薄暗い倉庫風グラデーション）
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#3a362f');
        bg.addColorStop(1, '#23211d');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // 棚のシルエット
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(40, 90 + i * 95, w - 80, 8);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        [70, 230, 380, 500].forEach((x, i) => {
            ctx.fillRect(x, 130 + (i % 2) * 95, 90 + (i % 3) * 20, 55);
        });

        // 中央のコードラベル
        const cx = w / 2, cy = h / 2;
        ctx.fillStyle = '#f3efe6';
        ctx.fillRect(cx - 130, cy - 78, 260, 156);
        ctx.strokeStyle = '#c8401f';
        ctx.lineWidth = 6;
        ctx.strokeRect(cx - 130, cy - 78, 260, 156);

        ctx.fillStyle = '#23211d';
        ctx.textAlign = 'center';
        ctx.font = '700 18px "IBM Plex Mono", monospace';
        ctx.fillText('CHAMELEON CODE', cx, cy - 42);
        ctx.font = '700 52px "IBM Plex Mono", monospace';
        ctx.fillStyle = '#c8401f';
        ctx.fillText(`No.${item.ccCode}`, cx, cy + 16);
        ctx.font = '500 17px "Zen Kaku Gothic New", sans-serif';
        ctx.fillStyle = '#23211d';
        ctx.fillText(item.id, cx, cy + 52);

        // タイムスタンプ帯
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, h - 40, w, 40);
        ctx.fillStyle = '#ffd863';
        ctx.textAlign = 'right';
        ctx.font = '500 18px "IBM Plex Mono", monospace';
        ctx.fillText(datetime, w - 16, h - 14);
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '500 15px "Zen Kaku Gothic New", sans-serif';
        ctx.fillText('● DEMO CAMERA', 16, h - 14);

        return cv.toDataURL('image/jpeg', 0.85);
    }

    return { isReal, readReal, pickDemoTarget, makeDemoPhoto };
})();
