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
  cre:     { n: 'クレアチン 5g',                k: 0,   p: 0 },
  lunch:   { n: '職場の昼食',                   k: 550, p: 20 },
  egg:     { n: 'ゆで卵 1個',                   k: 70,  p: 6 },
  rice:    { n: '白米 100g',                    k: 156, p: 2.5 },
  sweet:   { n: 'さつまいも 150g',              k: 195, p: 2 },
  momo150: { n: '皮なし鶏もも肉 150g',          k: 200, p: 29 },
  momo120: { n: '皮なし鶏もも肉 120g',          k: 160, p: 23 },
  mune150: { n: '皮なし鶏むね肉 150g',          k: 165, p: 35 },
  saba:    { n: 'サバ水煮缶 1缶',               k: 250, p: 30 },
  tuna:    { n: 'ノンオイルシーチキン 1缶',      k: 55,  p: 12 },
  natto:   { n: '納豆 1パック',                 k: 90,  p: 7 },
  tofu100: { n: '冷奴 100g',                    k: 60,  p: 5 },
  tofu150: { n: '冷奴 150g',                    k: 90,  p: 7.5 },
  broc:    { n: 'ブロッコリー 100g',            k: 37,  p: 5 },
  veg:     { n: '野菜 100g程度',                k: 30,  p: 2 },
  miso:    { n: '味噌汁 1杯',                   k: 35,  p: 2 }
};

// 単品リストの並び順
export const FOOD_ORDER = [
  'rice','sweet','momo150','momo120','mune150','saba','tuna','natto',
  'tofu100','tofu150','egg','broc','veg','miso','pro','nat','gf','lunch','cre'
];

// ワンタップで入る固定セット
export const SETS = [
  { slot: 'breakfast', name: '朝食セット',       items: ['gf','nat','pro','cre'] },
  { slot: 'lunch',     name: '昼食セット',       items: ['lunch','egg'] },
  { slot: 'night',     name: '寝る前プロテイン', items: ['pro'] }
];

// 夕食メニュー①〜⑦
export const DINNERS = [
  { name: '① 鶏もも＋白米',            items: ['rice','momo150','egg','broc','miso'] },
  { name: '② サバ＋さつまいも',        items: ['sweet','saba','egg','tofu100','veg'] },
  { name: '③ ツナ＋納豆＋白米',        items: ['rice','tuna','natto','egg','veg','miso'] },
  { name: '④ 鶏むね＋さつまいも',      items: ['sweet','mune150','egg','broc','miso'] },
  { name: '⑤ サバ＋納豆＋白米',        items: ['rice','saba','natto','egg','veg'] },
  { name: '⑥ 鶏もも＋豆腐＋さつまいも', items: ['sweet','momo120','tofu150','egg','veg'] },
  { name: '⑦ ツナ＋豆腐＋白米',        items: ['rice','tuna','tofu150','egg','veg','miso'] }
];
