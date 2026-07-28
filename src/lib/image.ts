/**
 * 食材 / 菜谱 实物图工具
 * - 食材：读取本地静态图（稳定、秒开）
 * - 菜谱：读取本地静态图（稳定、秒开）
 */

type ImageSize = "square" | "square_hd" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9";

// URL 版本号：改动时 +1，强制绕过浏览器 / CDN 的旧缓存
const URL_VERSION = "v4";

/** 食材专属 prompt（中文名 → 详细英文描述） */
export const INGREDIENT_PROMPTS: Record<string, string> = {
  // 蔬菜
  tomato: "a single fresh ripe red tomato",
  cucumber: "a fresh whole green cucumber",
  broccoli: "a head of fresh green broccoli",
  potato: "a few whole raw yellow potatoes",
  bok_choy: "a bunch of fresh baby bok choy",
  eggplant: "a fresh whole purple eggplant",
  shiitake: "fresh whole shiitake mushrooms",
  cabbage: "a head of fresh napa cabbage",
  spinach: "a bunch of fresh green spinach leaves",
  green_bean: "a handful of fresh green beans",
  carrot: "a bunch of fresh whole orange carrots",
  winter_melon: "a whole fresh winter melon",
  corn: "two fresh yellow corn cobs",
  lettuce: "a head of fresh green lettuce",
  mushroom: "a cluster of fresh white button mushrooms",
  lotus_root: "fresh sliced lotus root showing the hole pattern",
  onion: "a whole fresh yellow onion",
  green_pepper: "a fresh whole green bell pepper",
  red_pepper: "a fresh whole red bell pepper",
  fungus: "a bowl of fresh black wood ear mushrooms",
  chive: "a bunch of fresh chinese chives",

  // 肉禽
  pork_belly: "raw pork belly slices on a plate",
  pork: "raw pork slices on a plate",
  ground_pork: "a bowl of raw ground pork",
  chicken_thigh: "two raw chicken legs",
  chicken_breast: "raw chicken breast fillets",
  chicken_wing: "raw chicken wings",
  beef: "raw beef slices on a plate",
  ribs: "raw pork ribs",

  // 海鲜
  shrimp: "fresh raw shrimp",
  sea_bass: "a whole fresh sea bass fish",
  squid: "fresh whole cleaned squid",
  hairtail: "a whole fresh hairtail fish",
  clam: "a bowl of fresh clams",

  // 豆制品
  tofu: "a block of soft silken tofu on a plate",
  firm_tofu: "a block of firm tofu cut into cubes",

  // 蛋奶
  egg: "three fresh white eggs",
  milk: "a glass of fresh white milk",

  // 主食
  rice: "a bowl of steamed white rice",
  noodle: "a bundle of fresh yellow noodles",
  dumpling_wrapper: "round dumpling wrappers stacked",
  mantou: "fresh white chinese steamed buns",
  flour: "a bowl of white wheat flour with rolling pin",

  // 调味
  scallion: "a bunch of fresh green scallions",
  ginger: "fresh ginger root",
  garlic: "a head of fresh garlic with cloves",
  dried_chili: "a pile of dried red chili peppers",
  peanut: "a bowl of roasted peanuts",
  cilantro: "a bunch of fresh cilantro",
  sichuan_pepper: "a small pile of sichuan peppercorns",

  // 水果
  lemon: "fresh whole yellow lemons",
  apple: "fresh red apples",
  pear: "fresh snow pears",
  strawberry: "a bowl of fresh red strawberries",

  // —— 扩 充（54 → 79）——
  // 蔬菜
  cauliflower: "a fresh head of white cauliflower",
  sweet_potato: "a pile of fresh sweet potatoes with red skin",
  water_spinach: "a bunch of fresh water spinach with hollow stems",
  you_mai_cai: "a bunch of fresh youmai lettuce leaves",
  enoki: "a cluster of fresh enoki mushrooms",
  king_oyster: "two fresh king oyster mushrooms",
  taro: "a pile of fresh taro roots with brown skin",
  loofah: "two fresh whole loofah gourds",
  bitter_melon: "fresh whole bumpy bitter melons",
  bamboo_shoot: "fresh peeled bamboo shoots",
  kelp: "a pile of fresh dried kelp strips",
  edamame: "a bowl of fresh edamame pods",
  // 肉禽
  lamb: "raw lamb slices on a plate",
  duck_breast: "raw duck breast fillets",
  // 海鲜
  scallop: "a plate of fresh sea scallops in shells",
  yellow_croaker: "a whole fresh yellow croaker fish",
  crucian_carp: "a whole fresh crucian carp fish",
  crab: "a fresh whole steamed crab",
  // 豆制品
  tofu_skin: "fresh tofu skin sheets stacked",
  yuba: "a bundle of fresh yuba sticks",
  // 蛋奶
  yogurt: "a bowl of white yogurt with fruits",
  butter: "a block of fresh butter on a plate",
  // 主食
  vermicelli: "a bundle of dry vermicelli noodles",
  glutinous_rice: "a bowl of raw glutinous rice",
  bread: "fresh sliced white toast bread",
  // 调味
  rock_sugar: "a pile of translucent rock sugar crystals",
  yeast: "a small packet of dry yeast",
  cinnamon: "a few pieces of cinnamon bark",
  star_anise: "a few whole star anise pods",
  sesame: "a small pile of white sesame seeds",
  // 水果
  banana: "a bunch of fresh yellow bananas",
  mango: "fresh whole yellow mangoes",
  blueberry: "a bowl of fresh blueberries",
  seaweed: "a pile of dried purple seaweed sheets",
};

/** 菜谱专属 prompt（英文名 → 详细描述） */
export const RECIPE_PROMPTS: Record<string, string> = {
  "smashed-cucumber": "Chinese smashed cucumber salad with garlic in a bowl",
  "cold-tofu": "chinese silken tofu with scallion oil and soy sauce",
  "cold-fungus": "Chinese cold dressed wood ear mushroom salad",
  "cold-spinach": "Chinese cold spinach salad with sesame",
  "cold-lotus": "Chinese lotus root salad slices",
  "garlic-cucumber": "garlic cucumber salad in a white bowl",
  "tomato-egg": "Chinese tomato and scrambled eggs on a plate",
  "garlic-broccoli": "stir fried broccoli with garlic",
  "tomato-potato": "braised tomato and potato slices",
  "dry-fry-bean": "dry fried Chinese green beans with chili",
  "spicy-potato": "spicy sour shredded potatoes",
  "braised-eggplant": "Chinese braised eggplant with garlic",
  "cabbage-soup-style": "baby cabbage in clear soup",
  "garlic-spinach": "garlic sauteed spinach",
  "shiitake-greens": "stir fried shiitake mushrooms and bok choy",
  "vinegar-cabbage": "vinegar sauteed napa cabbage with chili",
  "stir-lotus": "stir fried lotus root slices",
  "onion-egg": "Chinese onion scrambled eggs",
  "green-pepper-potato": "stir fried shredded potato with green pepper",
  "carrot-fungus": "stir fried carrot and black fungus",
  "braised-pork": "Chinese braised pork belly in dark sauce",
  "kung-pao-chicken": "kung pao chicken with peanuts and chili",
  "sweet-sour-ribs": "sweet and sour pork ribs glazed",
  "red-braised-ribs": "Chinese red braised pork ribs",
  "cola-wings": "glazed cola chicken wings",
  "spicy-chicken": "Sichuan la zi ji spicy chicken with chili",
  "mu-shu-pork": "Chinese moo shu pork with eggs and vegetables",
  "yu-xiang-pork": "yuxiang shredded pork in sauce",
  "scallion-beef": "Chinese scallion stir fried beef",
  "potato-beef": "Chinese braised beef and potato stew",
  "stir-pepper-pork": "Chinese farmhouse stir fried pork with peppers",
  "soy-chicken-leg": "soy braised chicken legs",
  "white-cut-chicken": "Chinese white cut chicken sliced on a plate",
  "saliva-chicken": "Sichuan mouth watering chicken with chili oil",
  "tomato-beef": "Chinese braised beef brisket with tomato",
  "garlic-ribs": "crispy garlic pork ribs",
  "mapo-tofu": "Sichuan mapo tofu in spicy sauce",
  "home-tofu": "Chinese braised firm tofu home style",
  "tomato-tofu-soup": "Chinese tomato tofu egg drop soup",
  "crispy-tofu": "crispy fried tofu cubes golden",
  "three-fresh-tofu": "three fresh tofu hot pot",
  "salt-pepper-shrimp": "salt and pepper fried shrimp",
  "steamed-sea-bass": "Chinese steamed sea bass with soy sauce",
  "sauteed-squid": "sauteed squid with sweet bean sauce",
  "braised-hairtail": "Chinese braised hairtail fish",
  "garlic-steamed-shrimp": "garlic steamed shrimp in shell",
  "clam-egg": "clam steamed egg custard",
  "egg-fried-rice": "Chinese egg fried rice with scallion",
  "tomato-egg-noodle": "tomato and egg noodle soup",
  "scallion-oil-noodle": "scallion oil noodles Shanghai style",
  "yangchun-noodle": "yangchun noodles simple clear broth",
  "zhajiang-noodle": "Beijing zhajiang noodles with cucumber",
  "beef-noodle": "Taiwanese braised beef noodle soup",
  jiaozi: "Chinese boiled pork dumplings jiaozi",
  "scallion-pancake": "Chinese scallion pancake flaky",
  "steamed-mantou": "Chinese steamed mantou buns",
  "egg-pancake": "Chinese scallion egg pancake",
  "tomato-egg-soup": "Chinese tomato egg drop soup",
  "winter-melon-rib-soup": "winter melon pork ribs soup",
  "corn-rib-soup": "corn and pork ribs soup",
  "tomato-beef-soup": "tomato beef brisket soup",
  "hot-sour-soup": "Chinese hot and sour soup",
  "steamed-egg": "silky Chinese steamed egg custard",
  "lemon-water": "lemon water with honey and ice",
  "caramel-pudding": "caramel custard pudding dessert",
  "double-skin-milk": "Chinese double skin milk dessert",
  "pear-soup": "Chinese rock sugar pear soup",
  "strawberry-milk": "fresh strawberry milk in a glass",
  "apple-cake": "apple pancake mini cakes",

  // —— 凉菜 —— 7-20
  "cold-kelp": "Chinese cold kelp seaweed salad",
  "cold-fungus-spinach": "cold spinach and wood ear salad",
  "cold-tomato": "sliced tomato with sugar Chinese style",
  "cold-shiitake": "cold dressed shiitake mushrooms",
  "cold-edamame": "spicy edamame beans cold",
  "cold-bamboo": "cold shredded bamboo shoot salad",
  "cold-enoki": "cold enoki mushroom salad",
  "cold-tofu-skin": "cold tofu skin salad with cucumber",
  "cold-peanut": "vinegar soaked peanuts Chinese",
  "cold-skin-cucumber": "Suo Yi cucumber thin sliced salad",
  "cold-mushroom": "cold button mushroom salad",
  "cold-kelp-tofu": "kelp and tofu cold salad",
  "cold-spinach-fungus": "spinach and wood ear salad with carrot",
  "cold-mixed": "Chinese cold three shredded salad",

  // —— 蔬菜 22-35 —— 14 道新
  "garlic-bok-choy": "garlic stir fried baby bok choy",
  "stir-water-spinach": "garlic stir fried water spinach",
  "stir-you-mai-cai": "garlic stir fried you mai lettuce",
  "tomato-cauliflower": "stir fried cauliflower with tomato",
  "dry-fry-cauliflower": "dry wok cauliflower with chili",
  "sweet-potato-cube": "honey roasted sweet potato cubes",
  "taro-pork": "braised pork belly with taro",
  "loofah-egg": "Chinese loofah stir fried with egg",
  "stir-bitter-melon": "bitter melon stir fried with egg",
  "stir-bamboo": "braised bamboo shoots soy sauce",
  "enoki-egg": "enoki mushroom scrambled eggs",
  "king-oyster-scallion": "oyster sauce king oyster mushrooms",
  "stir-king-oyster": "black pepper king oyster mushrooms",
  "stir-fungus-spinach": "wood ear and spinach stir fry",
  "stir-mushroom": "oyster sauce sauteed button mushrooms",
  "stir-mixed": "stir fried mixed vegetables trio",
  "stir-tomato-flower": "stir fried cauliflower with tomato",
  "tomato-mushroom": "stir fried tomato and mushrooms",
  "stir-spinach-egg": "spinach scrambled eggs Chinese",
  "braised-loofah": "garlic braised loofah gourd",
  "spicy-eggplant": "yu xiang eggplant Chinese style",
  "stir-fungus": "stir fried black wood ear mushrooms",
  "taro-cake": "pan fried taro cake slices",

  // —— 肉禽 17-40 —— 24 道新
  "twice-cooked-pork": "Sichuan twice cooked pork slices",
  "dongpo-pork": "Dongpo braised pork belly classic",
  "braised-trotters": "Chinese braised pig trotters",
  "braised-pork-radish": "braised pork belly with radish",
  "lion-head-meatball": "large Chinese braised pork meatballs",
  "shredded-pork-bean": "minced pork with green beans",
  "sweet-sour-pork": "sweet and sour pork fillet crispy",
  "teriyaki-chicken": "Japanese teriyaki chicken thigh",
  "lemon-chicken": "lemon glazed chicken wings",
  "braised-chicken": "Chinese braised chicken pieces with potato",
  "steamed-chicken": "black bean steamed chicken",
  "beef-stew": "Chinese red braised beef stew",
  "pepper-beef": "black pepper beef strips with onions",
  "mongolian-beef": "Mongolian style scallion beef",
  "cumin-lamb": "cumin lamb slices with chili",
  "braised-lamb": "braised lamb with radish",
  "lamb-scallion": "scallion stir fried lamb slices",
  "soy-chicken-wing": "soy braised chicken wings",
  "curry-chicken": "Japanese curry chicken with potato",
  "shredded-pork-fungus": "minced pork with wood ear mushrooms",
  "duck-breast": "sauteed duck breast with sweet bean sauce",
  "braised-lamb-chestnut": "braised lamb with chestnuts",
  "tomato-pork": "stir fried tomato with pork slices",
  "pickled-cabbage-pork": "sauerkraut stewed pork",

  // —— 豆制品 6-15 —— 10 道新
  "braised-tofu": "Chinese braised tofu with egg",
  "yuba-cold": "cold yuba sticks salad",
  "braised-tofu-skin": "braised tofu skin in soy sauce",
  "garlic-tofu": "pan fried garlic tofu",
  "enoki-tofu": "enoki mushroom and tofu clear soup",
  "tofu-puff-stew": "fried tofu puffs with vermicelli stew",
  "stir-firm-tofu": "pan fried firm tofu with soy",
  "mapo-tofu-tender": "tender version mapo tofu",
  "yuba-stew": "braised yuba with pork slices",
  "seaweed-tofu": "seaweed and tofu clear soup",

  // —— 海鲜 7-20 —— 14 道新
  "yellow-croaker-steamed": "Chinese steamed yellow croaker",
  "braised-yellow-croaker": "braised yellow croaker fish",
  "stir-squid": "stir fried squid tentacles with peppers",
  "sweet-sour-mandarin": "sweet and sour whole carp fish",
  "steamed-scallop": "garlic vermicelli steamed scallop",
  "scallop-egg": "scallop steamed egg custard",
  "crab-steamed": "whole steamed hairy crab Chinese",
  "spicy-crab": "Sichuan spicy stir fried crab",
  "shrimp-tofu": "shrimp and tofu braised",
  "shrimp-omelette": "Chinese shrimp scrambled eggs",
  "shrimp-fungus": "shrimp and wood ear stir fry",
  "spicy-fish": "spicy fried hairtail fish chunks",
  "stir-clam": "spicy stir fried clams with chili",
  "braised-carp": "doubanjiang braised carp fish",

  // —— 主食 11-30 —— 20 道新
  "tomato-rice": "tomato egg rice bowl",
  "braised-pork-rice": "Taiwanese braised pork rice",
  "curry-rice": "Japanese curry beef rice",
  "shrimp-fried-rice": "shrimp fried rice with egg",
  wonton: "Shanghai wonton soup",
  "dandan-noodle": "Sichuan dan dan noodles",
  "hot-dry-noodle": "Wuhan hot dry noodles",
  "cold-noodle": "cold chicken shredded noodles",
  "rice-noodle": "sour and spicy rice noodles",
  "hot-sour-noodle": "Chongqing hot sour rice noodles",
  "beef-rice-bowl": "Chinese beef rice bowl",
  "pork-radish-pie": "shredded radish pancake",
  "chicken-rice-bowl": "teriyaki chicken rice bowl",
  "sweet-potato-pie": "fried sweet potato sesame balls",
  "pork-rib-rice": "braised pork ribs rice",
  "noodle-soup": "homestyle tomato egg noodle soup",
  "cold-skin-noodle": "cold liangpi noodles with sesame",
  "toast-egg": "toast egg cup baked",
  "fried-bread": "French toast with honey",
  "spring-roll": "vegetable spring rolls fried",

  // —— 汤粥 7-25 —— 19 道新
  "seaweed-egg": "seaweed egg drop soup",
  "wonton-soup": "pork wonton clear soup",
  "chicken-corn-soup": "chicken corn carrot soup",
  "lamb-soup": "lamb and radish soup",
  "pork-rib-lotus": "lotus root pork ribs soup",
  "pork-rib-taro": "taro pork ribs soup",
  "pork-rib-cabbage": "napa cabbage pork ribs soup",
  "crucian-carp-tofu": "crucian carp tofu milky soup",
  "fish-head-tofu": "fish head tofu milky soup",
  "chicken-soup": "old mother chicken clear soup",
  "kelp-rib-soup": "kelp pork ribs soup",
  "bacon-winter-melon": "salt pork winter melon soup",
  "preserved-egg-soup": "century egg tofu soup",
  "white-fungus-soup": "white fungus lotus seed soup",
  "chicken-mushroom": "chicken stewed with mushrooms",
  "four-treasure": "four treasure chicken soup",
  "spare-ribs-yam": "yam pork ribs soup",
  "pumpkin-congee": "pumpkin millet porridge",
  "chicken-congee": "chicken congee rice porridge",

  // —— 甜品 7-18 —— 12 道新
  "mango-pudding": "mango pudding dessert",
  "fruit-salad": "fresh fruit salad with yogurt",
  "mango-sago": "Hong Kong mango pomelo sago",
  "red-bean-soup": "Chinese red bean sweet soup",
  "mung-bean-soup": "Chinese mung bean sweet soup",
  "tang-yuan": "black sesame tang yuan glutinous balls",
  "egg-tart": "Portuguese egg tart pastry",
  souffle: "Japanese souffle pancake fluffy",
  tiramisu: "Italian tiramisu dessert",
  "ice-cream": "homemade vanilla ice cream",
  "chocolate-mousse": "chocolate mousse dessert",
  "panna-cotta": "Italian panna cotta",
  "fruit-jelly": "fruit jelly dessert cups",
  "honey-toast": "honey butter toast with ice cream",
  "mango-sticky": "Thai mango sticky rice",
  "banana-pancake": "banana pancakes fluffy",
  "yogurt-fruit": "yogurt fruit bowl with granola",
  "pear-sugar": "rock sugar snow pear soup",

  // —— 自制 1-10
  "chili-oil": "homemade chili oil in jar",
  "sesame-paste": "homemade sesame paste",
  "scallion-oil-2": "homemade scallion oil in jar",
  "master-sauce": "Chinese master braising sauce",
  "sweet-sour-sauce": "homemade sweet and sour sauce",
  "tomato-sauce": "homemade tomato ketchup",
  "garlic-sauce": "homemade garlic sauce in jar",
  "salad-dressing": "homemade salad dressing",
  "strawberry-jam": "homemade strawberry jam jar",
  lemonade: "fresh honey lemon drink",
};

function buildLocalIngredientUrl(id: string): string {
  return `/food/ingredients/${id}.jpg?v=${URL_VERSION}`;
}

function buildLocalRecipeUrl(id: string): string {
  return `/food/recipes/${id}.jpg?v=${URL_VERSION}`;
}

export function ingredientImageUrl(id: string, _size: ImageSize = "square"): string {
  void _size;
  return buildLocalIngredientUrl(id);
}

export function recipeImageUrl(id: string, _size: ImageSize = "square"): string {
  void _size;
  return buildLocalRecipeUrl(id);
}
