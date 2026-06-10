/**
 * seed-data.js
 * 備品の初期データ。初回起動時に localStorage へ投入される。
 * file:// 直開きでも動作するよう、JSON ファイルではなく JS で同梱する。
 *
 * id      : 管理番号（EQ-連番4桁）。カメレオンコード番号と1:1で対応する
 * ccCode  : カメレオンコードの番号（= 管理番号の数値部）
 * manager : 管理者（デモのため部署名で表記）
 */
window.__SEED_EQUIPMENTS__ = [
    /* ---------- Aビル5F ---------- */
    { id: "EQ-0001", ccCode: "1",  name: "ノートPC 13インチ",        modelNumber: "NB-1301-G4",  manager: "情報システム部", location: "Aビル5F", category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0002", ccCode: "2",  name: "27インチ液晶モニター",     modelNumber: "DM-2701Q",    manager: "情報システム部", location: "Aビル5F", category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0003", ccCode: "3",  name: "A4複合機",                 modelNumber: "MFP-450C",    manager: "総務部",         location: "Aビル5F", category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0004", ccCode: "4",  name: "電動シュレッダー",         modelNumber: "SH-220X",     manager: "総務部",         location: "Aビル5F", category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0005", ccCode: "5",  name: "モバイルプロジェクター",   modelNumber: "PJ-S10",      manager: "営業部",         location: "Aビル5F", category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0006", ccCode: "6",  name: "加湿空気清浄機",           modelNumber: "AP-H700",     manager: "総務部",         location: "Aビル5F", category: "社内備品", status: "廃棄予定", checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0007", ccCode: "7",  name: "5F 執務室 入口鍵",         modelNumber: "KEY-5F-01",   manager: "総務部",         location: "Aビル5F", category: "建屋鍵",   status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0008", ccCode: "8",  name: "5F 会議室A 鍵",            modelNumber: "KEY-5F-02",   manager: "総務部",         location: "Aビル5F", category: "建屋鍵",   status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0009", ccCode: "9",  name: "来客用バッジ 5F-01",       modelNumber: "BDG-5F-01",   manager: "総務部",         location: "Aビル5F", category: "社員バッジ", status: "使用中", checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0010", ccCode: "10", name: "来客用バッジ 5F-02",       modelNumber: "BDG-5F-02",   manager: "総務部",         location: "Aビル5F", category: "社員バッジ", status: "使用中", checked: false, checkedAt: null, imageKey: null },

    /* ---------- Aビル6F ---------- */
    { id: "EQ-0011", ccCode: "11", name: "ノートPC 14インチ",        modelNumber: "NB-1402-G2",  manager: "開発部",         location: "Aビル6F", category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0012", ccCode: "12", name: "34インチウルトラワイド",   modelNumber: "DM-3401U",    manager: "開発部",         location: "Aビル6F", category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0013", ccCode: "13", name: "電子ホワイトボード",       modelNumber: "WB-E65",      manager: "開発部",         location: "Aビル6F", category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0014", ccCode: "14", name: "コーヒーメーカー",         modelNumber: "CM-900",      manager: "総務部",         location: "Aビル6F", category: "社内備品", status: "廃棄予定", checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0015", ccCode: "15", name: "6F 執務室 入口鍵",         modelNumber: "KEY-6F-01",   manager: "総務部",         location: "Aビル6F", category: "建屋鍵",   status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0016", ccCode: "16", name: "6F 倉庫鍵",                modelNumber: "KEY-6F-02",   manager: "総務部",         location: "Aビル6F", category: "建屋鍵",   status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0017", ccCode: "17", name: "来客用バッジ 6F-01",       modelNumber: "BDG-6F-01",   manager: "総務部",         location: "Aビル6F", category: "社員バッジ", status: "使用中", checked: false, checkedAt: null, imageKey: null },

    /* ---------- 本社 ---------- */
    { id: "EQ-0018", ccCode: "18", name: "デスクトップPC",           modelNumber: "DT-7080S",    manager: "情報システム部", location: "本社",             category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0019", ccCode: "19", name: "A3レーザープリンター",     modelNumber: "LP-A3200",    manager: "総務部",         location: "本社",             category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0020", ccCode: "20", name: "応接セット（4人用）",      modelNumber: "RS-400",      manager: "総務部",         location: "本社",             category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0021", ccCode: "21", name: "耐火金庫",                 modelNumber: "SF-100E",     manager: "経理部",         location: "本社",             category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0022", ccCode: "22", name: "テレビ会議システム",       modelNumber: "VC-Bar50",    manager: "情報システム部", location: "本社",             category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0023", ccCode: "23", name: "正面玄関 鍵",              modelNumber: "KEY-HQ-01",   manager: "総務部",         location: "本社",             category: "建屋鍵",   status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0024", ccCode: "24", name: "サーバー室 鍵",            modelNumber: "KEY-HQ-02",   manager: "情報システム部", location: "本社",             category: "建屋鍵",   status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0025", ccCode: "25", name: "書庫 鍵",                  modelNumber: "KEY-HQ-03",   manager: "総務部",         location: "本社",             category: "建屋鍵",   status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0026", ccCode: "26", name: "来客用バッジ H-01",        modelNumber: "BDG-HQ-01",   manager: "総務部",         location: "本社",             category: "社員バッジ", status: "使用中", checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0027", ccCode: "27", name: "来客用バッジ H-02",        modelNumber: "BDG-HQ-02",   manager: "総務部",         location: "本社",             category: "社員バッジ", status: "使用中", checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0028", ccCode: "28", name: "臨時入館証 H-T01",         modelNumber: "BDG-HQ-T01",  manager: "総務部",         location: "本社",             category: "社員バッジ", status: "使用中", checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0029", ccCode: "29", name: "ハイブリッド車（5人乗り）", modelNumber: "HV-50A",     manager: "総務部",         location: "本社",             category: "社用車",   status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0030", ccCode: "30", name: "ワゴン車（10人乗り）",     modelNumber: "VAN-200W",    manager: "総務部",         location: "本社",             category: "社用車",   status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0031", ccCode: "31", name: "軽バン",                   modelNumber: "KV-660",      manager: "総務部",         location: "本社",             category: "社用車",   status: "廃棄予定", checked: false, checkedAt: null, imageKey: null },

    /* ---------- 技術センター ---------- */
    { id: "EQ-0032", ccCode: "32", name: "3Dプリンター",             modelNumber: "3DP-X1",      manager: "開発部",         location: "技術センター",   category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0033", ccCode: "33", name: "オシロスコープ",           modelNumber: "OSC-2204",    manager: "開発部",         location: "技術センター",   category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0034", ccCode: "34", name: "はんだ付けステーション",   modelNumber: "SS-951",      manager: "開発部",         location: "技術センター",   category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0035", ccCode: "35", name: "工具セット一式",           modelNumber: "TL-SET88",    manager: "開発部",         location: "技術センター",   category: "社内備品", status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0036", ccCode: "36", name: "実験棟 鍵",                modelNumber: "KEY-TC-01",   manager: "開発部",         location: "技術センター",   category: "建屋鍵",   status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0037", ccCode: "37", name: "資材庫 鍵",                modelNumber: "KEY-TC-02",   manager: "総務部",         location: "技術センター",   category: "建屋鍵",   status: "使用中",   checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0038", ccCode: "38", name: "来客用バッジ T-01",        modelNumber: "BDG-TC-01",   manager: "総務部",         location: "技術センター",   category: "社員バッジ", status: "使用中", checked: false, checkedAt: null, imageKey: null },
    { id: "EQ-0039", ccCode: "39", name: "ライトバン",               modelNumber: "LV-1500",     manager: "開発部",         location: "技術センター",   category: "社用車",   status: "使用中",   checked: false, checkedAt: null, imageKey: null }
];
