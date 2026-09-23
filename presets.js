// 食事メニューのプリセット定義（増量期メニュー 〜12月）
// 数値を変えたいときはこのファイルだけ編集すれば全体に反映されます。

export const GOAL = { kcal: 1500, protein: 100 };

export const SLOTS = [
  { id: 'breakfast', name: '朝食' },
  { id: 'lunch',     name: '昼食' },
  { id: 'snack',     name: '間食' },
  { id: 'dinner',    name: '夕食' },
  { id: 'night',     name: '寝る前' }
];

export const FOODS = {
  gf:      { n: 'ピンクグレープフルーツ 1/2個', k: 40,  p: 0.8 },
  nat:     { n: 'ナチュレ恵 133g(1/3)',        k: 80,  p: 4.5 },
  pro:     { n: 'プロテイン 1杯',               k: 121, p: 22 },
  cre:     { n: 'クレアチン 5g',                k: 18,  p: 4.5 },
  bcaa:    { n: 'BCAA',                         k: 5,   p: 0 },
  lunch:   { n: '職場の昼食',                   k: 550, p: 20 },
  egg:     { n: 'ゆで卵 1個',                   k: 70,  p: 6 },
  rice:    { n: '白米 100g',                    k: 156, p: 2.5 },
  sweet:   { n: 'さつまいも 150g',              k: 195, p: 2 },
  momo:    { n: '皮なし鶏もも肉 100g',          k: 133, p: 19.3 },
  mune:    { n: '皮なし鶏むね肉 100g',          k: 110, p: 23.3 },
  saba:    { n: 'サバ水煮缶 1缶',               k: 250, p: 30 },
  tuna:    { n: 'ノンオイルシーチキン 1缶',      k: 55,  p: 12 },
  natto:   { n: '納豆 1パック',                 k: 90,  p: 7 },
  tofu100: { n: '冷奴 100g',                    k: 60,  p: 5 },
  tofu150: { n: '冷奴 150g',                    k: 90,  p: 7.5 },
  broc:    { n: 'ブロッコリー 100g',            k: 37,  p: 5 },
  veg:     { n: '野菜 100g程度',                k: 30,  p: 2 },
  miso:    { n: '味噌汁 1杯',                   k: 35,  p: 2 },
  milk:    { n: '牛乳 50ml',                    k: 34,  p: 1.7 },
  soy:     { n: '無調整豆乳 50ml',              k: 23,  p: 1.8 },

  // ひさん用
  winzone: { n: 'WINZONE 14g',                  k: 55,  p: 10.1 },
  yog:     { n: 'ヨーグルト 約133g',            k: 54,  p: 6.3 },
  genmai:  { n: '玄米おにぎり 90g',             k: 137, p: 2.5 },
  tamago:  { n: '卵焼き 卵1個分',               k: 71,  p: 6.2 },
  buta:    { n: '豚バラ 40g',                   k: 146, p: 5.8 },
  ebi:     { n: 'むきエビ 3尾(約30g)',          k: 25,  p: 6 },
  mayo:    { n: 'マヨネーズ 小さじ1(約5g)',     k: 33,  p: 0.1 },
  choco:   { n: '72%チョコ 10粒(10g)',          k: 58,  p: 0.9 },
  cookie:  { n: '自作米粉クッキー レシピ1/3量', k: 150, p: 6 },
  kinu150: { n: '絹豆腐 150g',                  k: 84,  p: 7.9 },
  fruit:   { n: '果物（梨1/6・バナナ1/3等）',   k: 25,  p: 0.3 }
};

// 単品リストの並び順
export const FOOD_ORDER = [
  'rice','sweet','momo','mune','saba','tuna','natto',
  'tofu100','tofu150','kinu150','egg','tamago','broc','veg','miso',
  'genmai','buta','ebi','mayo','choco','cookie','fruit',
  'milk','soy','pro','winzone','bcaa','cre','nat','yog','gf','lunch'
];

// セットや夕食メニューの中身は 'キー' か ['キー', 個数] で書ける
// 例：['momo', 1.5] は 鶏もも100g × 1.5 ＝ 150g
export const SETS = [
  // あ
  { slot: 'breakfast', name: '朝食あセット',     items: ['gf','nat','pro','cre'] },
  { slot: 'lunch',     name: '昼食あセット',     items: ['lunch','egg'] },
  { slot: 'night',     name: '寝る前プロテイン', items: ['pro'] },
  // ひ
  { slot: 'breakfast', name: '朝食ひセット',     items: ['winzone','yog','egg'] },
  { slot: 'lunch',     name: '昼食ひセット',     items: ['genmai','tamago','buta','ebi',['broc',0.3],'mayo','miso','choco'] },
  { slot: 'snack',     name: '間食ひセット',     items: ['cookie'] },
  { slot: 'dinner',    name: '夕食ひセット',     items: ['kinu150','winzone','yog','egg','choco','fruit'] }
];

// 夕食メニュー①〜⑦
export const DINNERS = [
  { name: '① 鶏もも＋白米',            items: ['rice',['momo',1.5],'egg','broc','miso'] },
  { name: '② サバ＋さつまいも',        items: ['sweet','saba','egg','tofu100','veg'] },
  { name: '③ ツナ＋納豆＋白米',        items: ['rice','tuna','natto','egg','veg','miso'] },
  { name: '④ 鶏むね＋さつまいも',      items: ['sweet',['mune',1.5],'egg','broc','miso'] },
  { name: '⑤ サバ＋納豆＋白米',        items: ['rice','saba','natto','egg','veg'] },
  { name: '⑥ 鶏もも＋豆腐＋さつまいも', items: ['sweet',['momo',1.2],'tofu150','egg','veg'] },
  { name: '⑦ ツナ＋豆腐＋白米',        items: ['rice','tuna','tofu150','egg','veg','miso'] }
];
