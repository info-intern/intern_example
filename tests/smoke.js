/**
 * tests/smoke.js
 * ブラウザなしでロジック層（storage / equipment / inventory）を検証するスモークテスト。
 * 実行: node tests/smoke.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

/* ---------- ブラウザ環境のスタブ ---------- */
global.window = global; // window.indexedDB は未定義 → 画像はメモリフォールバックになる
const lsMap = new Map();
global.localStorage = {
    getItem: (k) => (lsMap.has(k) ? lsMap.get(k) : null),
    setItem: (k, v) => lsMap.set(k, String(v)),
    removeItem: (k) => lsMap.delete(k)
};

/* ---------- 対象スクリプトを <script> タグと同じ順で読み込む ---------- */
const files = ['seed-data.js', 'storage.js', 'equipment.js', 'inventory.js', 'reader.js'];
for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
    vm.runInThisContext(src, { filename: f });
}

(async () => {
    /* 1. シード投入 */
    assert.strictEqual(Equipment.all().length, 39, 'シード39件が読み込まれること');
    assert.strictEqual(Inventory.current().round, 1, '初回はラウンド1');

    /* 2. 拠点×区分の絞り込み */
    const cars = Equipment.filtered('本社', '社用車');
    assert.strictEqual(cars.length, 3, '本社の社用車は3件');
    assert.strictEqual(Equipment.filtered('Aビル5F', '社用車').length, 0, '5Fに社用車はない');
    assert.strictEqual(Equipment.filtered(null, null).length, 39, 'null 指定はすべて');

    /* 3. 新規登録（自動発番） */
    const created = Equipment.create({
        name: 'テスト備品', modelNumber: 'T-1', manager: '総務部',
        location: '本社', category: '社内備品', status: '使用中'
    });
    assert.strictEqual(created.id, 'EQ-0040', '管理番号は EQ-0040 が発行されること');
    assert.strictEqual(created.ccCode, '40', 'CCコードは管理番号と同じ番号');
    assert.strictEqual(Equipment.byCcCode('40').id, 'EQ-0040', 'CCコードで逆引きできること');

    /* 4. チェック + 画像保存（メモリフォールバック） */
    await Store.putImage('img-test', 'data:image/jpeg;base64,xxxx');
    assert.strictEqual(await Store.getImage('img-test'), 'data:image/jpeg;base64,xxxx', '画像の保存と取得');
    await Equipment.setChecked('EQ-0040', true, '2026-06-10 12:00:00', 'img-test');
    const checked = Equipment.byId('EQ-0040');
    assert.strictEqual(checked.checked, true);
    assert.strictEqual(checked.imageKey, 'img-test');

    /* 5. 進捗計算 */
    const p = Inventory.progress(Equipment.filtered('本社', '社内備品'));
    assert.strictEqual(p.done, 1, '本社・社内備品の済は1件');
    assert.strictEqual(p.total, 6, '本社・社内備品は6件（テスト備品含む）');

    /* 5b. 棚卸結果サマリ */
    const sum = Inventory.summary();
    assert.strictEqual(sum.total, 40, 'サマリ合計は40件');
    assert.strictEqual(sum.done, 1, 'サマリ確認済は1件（EQ-0040）');
    assert.strictEqual(sum.pending, 39, 'サマリ未確認は39件');
    assert.strictEqual(sum.byLocation.length, 4, '拠点別は4拠点ぶん');
    assert.strictEqual(sum.byLocation.reduce((a, b) => a + b.total, 0), 40, '拠点別合計は全件と一致');
    assert.ok(sum.pendingGroups.every(g => g.items.length > 0), '未確認グループに空は含まれない');
    assert.strictEqual(
        sum.pendingGroups.reduce((a, g) => a + g.items.length, 0), 39,
        '未確認グループの総数は未確認件数と一致');

    /* 6. チェック解除（写真は残る） */
    await Equipment.setChecked('EQ-0040', false);
    assert.strictEqual(Equipment.byId('EQ-0040').checked, false);
    assert.strictEqual(Equipment.byId('EQ-0040').checkedAt, null, '解除でチェック日時はクリア');

    /* 7. 永続化の確認（localStorage から再構築） */
    const raw = JSON.parse(lsMap.get('bihin.v3.equipments'));
    assert.strictEqual(raw.length, 40, 'localStorage に40件保存されていること');

    /* 8. 新しい回の開始（チェック・写真リセット） */
    await Equipment.setChecked('EQ-0001', true, '2026-06-10 12:30:00', 'img-test');
    await Inventory.startNewRound();
    assert.strictEqual(Inventory.current().round, 2, 'ラウンドが2に進むこと');
    assert.ok(Equipment.all().every(it => !it.checked && !it.imageKey), '全チェック・写真がリセットされること');
    assert.strictEqual(await Store.getImage('img-test'), null, '画像ストアも空になること');

    /* 9. 削除 */
    await Equipment.remove('EQ-0040');
    assert.strictEqual(Equipment.byId('EQ-0040'), null, '削除できること');
    assert.strictEqual(Equipment.all().length, 39);

    /* 10. 再発番は欠番を再利用しない（最大+1） */
    const again = Equipment.create({
        name: '再登録', modelNumber: '', manager: '',
        location: '本社', category: '社内備品', status: '使用中'
    });
    assert.strictEqual(again.id, 'EQ-0040', '最大番号+1で発番されること');

    console.log('OK: smoke test passed (11 sections)');
})().catch(err => {
    console.error('NG:', err.message);
    process.exit(1);
});
