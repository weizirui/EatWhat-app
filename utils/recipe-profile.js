const { findIngredientById } = require("./catalog");

const INGREDIENT_AMOUNT_MAP = {
  tomato: "2 个",
  cucumber: "1 根",
  broccoli: "1 颗",
  cauliflower: "1/2 颗",
  potato: "2 个",
  sweet_potato: "1 个",
  bok_choy: "1 把",
  water_spinach: "1 把",
  you_mai_cai: "1 把",
  eggplant: "2 根",
  shiitake: "6 朵",
  enoki: "1 把",
  king_oyster: "2 根",
  cabbage: "1/4 颗",
  spinach: "1 把",
  green_bean: "200g",
  carrot: "1 根",
  winter_melon: "300g",
  corn: "1 根",
  lettuce: "1 颗",
  mushroom: "200g",
  lotus_root: "1 节",
  taro: "250g",
  loofah: "1 根",
  bitter_melon: "1 根",
  onion: "1 个",
  green_pepper: "1 个",
  red_pepper: "1 个",
  fungus: "60g",
  chive: "1 小把",
  bamboo_shoot: "200g",
  kelp: "120g",
  edamame: "180g",
  pork_belly: "250g",
  pork: "200g",
  ground_pork: "120g",
  chicken_thigh: "2 只",
  chicken_breast: "1 块",
  chicken_wing: "8 只",
  beef: "200g",
  ribs: "400g",
  lamb: "220g",
  duck_breast: "1 块",
  shrimp: "250g",
  sea_bass: "1 条",
  squid: "250g",
  hairtail: "300g",
  clam: "350g",
  scallop: "6 只",
  yellow_croaker: "1 条",
  crucian_carp: "1 条",
  crab: "2 只",
  tofu: "1 盒",
  firm_tofu: "1 块",
  tofu_skin: "150g",
  yuba: "120g",
  egg: "2 个",
  milk: "250ml",
  yogurt: "200g",
  butter: "15g",
  rice: "1 碗",
  noodle: "200g",
  dumpling_wrapper: "20 张",
  mantou: "2 个",
  flour: "150g",
  vermicelli: "1 把",
  glutinous_rice: "150g",
  bread: "4 片",
  scallion: "2 根",
  ginger: "6 片",
  garlic: "4 瓣",
  dried_chili: "6 个",
  peanut: "30g",
  cilantro: "1 小把",
  sichuan_pepper: "5g",
  rock_sugar: "15g",
  yeast: "3g",
  cinnamon: "1 小段",
  star_anise: "2 颗",
  sesame: "10g",
  lemon: "1 个",
  apple: "1 个",
  pear: "1 个",
  strawberry: "8 颗",
  banana: "2 根",
  mango: "1 个",
  blueberry: "80g",
  seaweed: "1 小把",
};

const CALORIE_MAP = {
  tomato: 35,
  cucumber: 20,
  broccoli: 55,
  cauliflower: 45,
  potato: 160,
  sweet_potato: 170,
  bok_choy: 20,
  water_spinach: 22,
  you_mai_cai: 22,
  eggplant: 60,
  shiitake: 40,
  enoki: 35,
  king_oyster: 50,
  cabbage: 35,
  spinach: 25,
  green_bean: 70,
  carrot: 45,
  winter_melon: 25,
  corn: 120,
  lettuce: 18,
  mushroom: 45,
  lotus_root: 110,
  taro: 140,
  loofah: 28,
  bitter_melon: 25,
  onion: 45,
  green_pepper: 28,
  red_pepper: 28,
  fungus: 35,
  chive: 20,
  bamboo_shoot: 30,
  kelp: 28,
  edamame: 120,
  pork_belly: 520,
  pork: 280,
  ground_pork: 320,
  chicken_thigh: 320,
  chicken_breast: 240,
  chicken_wing: 420,
  beef: 300,
  ribs: 480,
  lamb: 360,
  duck_breast: 340,
  shrimp: 190,
  sea_bass: 220,
  squid: 170,
  hairtail: 280,
  clam: 130,
  scallop: 150,
  yellow_croaker: 210,
  crucian_carp: 230,
  crab: 160,
  tofu: 120,
  firm_tofu: 160,
  tofu_skin: 220,
  yuba: 240,
  egg: 140,
  milk: 110,
  yogurt: 120,
  butter: 110,
  rice: 230,
  noodle: 260,
  dumpling_wrapper: 220,
  mantou: 220,
  flour: 280,
  vermicelli: 200,
  glutinous_rice: 240,
  bread: 240,
  peanut: 180,
  sesame: 60,
  mango: 90,
  banana: 110,
  apple: 85,
  pear: 80,
  strawberry: 45,
  blueberry: 50,
};

const PROTEIN_MAP = {
  tomato: 1,
  cucumber: 1,
  broccoli: 4,
  cauliflower: 3,
  potato: 4,
  sweet_potato: 3,
  bok_choy: 2,
  water_spinach: 3,
  you_mai_cai: 2,
  eggplant: 2,
  shiitake: 5,
  enoki: 3,
  king_oyster: 4,
  cabbage: 2,
  spinach: 3,
  green_bean: 4,
  carrot: 1,
  winter_melon: 1,
  corn: 4,
  lettuce: 1,
  mushroom: 4,
  lotus_root: 3,
  taro: 3,
  loofah: 1,
  bitter_melon: 2,
  onion: 1,
  green_pepper: 1,
  red_pepper: 1,
  fungus: 2,
  chive: 2,
  bamboo_shoot: 3,
  kelp: 2,
  edamame: 13,
  pork_belly: 14,
  pork: 22,
  ground_pork: 20,
  chicken_thigh: 27,
  chicken_breast: 31,
  chicken_wing: 19,
  beef: 29,
  ribs: 24,
  lamb: 24,
  duck_breast: 23,
  shrimp: 24,
  sea_bass: 23,
  squid: 21,
  hairtail: 18,
  clam: 18,
  scallop: 23,
  yellow_croaker: 20,
  crucian_carp: 19,
  crab: 17,
  tofu: 14,
  firm_tofu: 18,
  tofu_skin: 22,
  yuba: 24,
  egg: 12,
  milk: 8,
  yogurt: 7,
  butter: 0,
  rice: 4,
  noodle: 7,
  dumpling_wrapper: 6,
  mantou: 6,
  flour: 6,
  vermicelli: 1,
  glutinous_rice: 4,
  bread: 7,
  peanut: 7,
  sesame: 3,
  mango: 1,
  banana: 1,
  apple: 0,
  pear: 0,
  strawberry: 1,
  blueberry: 1,
  seaweed: 2,
};

const KEYWORD_FLAVOR_RULES = [
  { pattern: /麻婆|椒麻|花椒|麻辣|口水|辣子鸡|香辣|水煮/, labels: ["麻辣", "下饭"] },
  { pattern: /糖醋|酸辣|酸汤|醋溜|鱼香/, labels: ["酸香", "开胃"] },
  { pattern: /红烧|卤|照烧|酱爆|回锅/, labels: ["浓香", "咸鲜"] },
  { pattern: /清蒸|蒸蛋|炖汤|清汤|白切/, labels: ["清淡", "鲜香"] },
  { pattern: /葱油|蒜蓉|蒜香/, labels: ["蒜香", "家常"] },
  { pattern: /甜|布丁|慕斯|果冻|奶冻|吐司|蛋挞|杨枝甘露|汤圆/, labels: ["香甜", "下午茶"] },
];

const BASE_SEASONING_AMOUNT_RULES = [
  { pattern: /盐|食盐/, amount: "1/3 小勺" },
  { pattern: /生抽|酱油/, amount: "1 汤勺" },
  { pattern: /老抽/, amount: "1/2 汤勺" },
  { pattern: /醋/, amount: "1 汤勺" },
  { pattern: /糖|白糖|冰糖/, amount: "1 小勺" },
  { pattern: /蚝油/, amount: "1 汤勺" },
  { pattern: /料酒/, amount: "1 汤勺" },
  { pattern: /淀粉/, amount: "1 小勺" },
  { pattern: /辣椒油/, amount: "1 小勺" },
  { pattern: /豆瓣酱/, amount: "1 汤勺" },
  { pattern: /花椒粉|黑胡椒/, amount: "1/4 小勺" },
  { pattern: /香油|芝麻油/, amount: "1/2 小勺" },
  { pattern: /黄油/, amount: "10g" },
  { pattern: /蜂蜜/, amount: "1 小勺" },
  { pattern: /牛奶|椰浆/, amount: "200ml" },
];

function amountForBaseSeasoning(name) {
  for (const rule of BASE_SEASONING_AMOUNT_RULES) {
    if (rule.pattern.test(name)) {
      return rule.amount;
    }
  }
  return "适量";
}

function buildBaseSeasoningLines(recipe) {
  return recipe.base_seasonings.map((name, index) => ({
    id: `${recipe.id}-seasoning-${index}`,
    name,
    text: `${name} · ${amountForBaseSeasoning(name)}`,
  }));
}

function fallbackAmountByCategory(categoryId) {
  const mapping = {
    veg: "150g",
    meat: "200g",
    seafood: "220g",
    tofu: "180g",
    egg: "2 个",
    staple: "1 份",
    seasoning: "少许",
    fruit: "1 份",
  };
  return mapping[categoryId] || "适量";
}

function amountForIngredient(ingredient) {
  if (!ingredient) {
    return "适量";
  }
  return INGREDIENT_AMOUNT_MAP[ingredient.id] || fallbackAmountByCategory(ingredient.category_id);
}

function ingredientLine(id) {
  const ingredient = findIngredientById(id);
  if (!ingredient) {
    return {
      id,
      text: `${id} · 适量`,
      amount: "适量",
      owned: false,
      className: "ingredient-pill ingredient-pill-missing",
    };
  }

  return {
    id,
    text: `${ingredient.emoji} ${ingredient.name} · ${amountForIngredient(ingredient)}`,
    amount: amountForIngredient(ingredient),
    baseText: `${ingredient.emoji} ${ingredient.name}`,
  };
}

function estimateCalories(recipe) {
  const total = recipe.ingredient_ids.reduce((sum, id) => {
    return sum + (CALORIE_MAP[id] || 60);
  }, 0);

  const extra = Math.min(recipe.base_seasonings.length * 18, 90);
  const minutesFactor = recipe.minutes > 30 ? 40 : 0;
  return Math.round(total + extra + minutesFactor);
}

function proteinForIngredient(ingredient) {
  if (!ingredient) {
    return 1;
  }
  if (PROTEIN_MAP[ingredient.id] != null) {
    return PROTEIN_MAP[ingredient.id];
  }

  const fallback = {
    veg: 2,
    meat: 22,
    seafood: 20,
    tofu: 14,
    egg: 10,
    staple: 5,
    seasoning: 1,
    fruit: 1,
  };

  return fallback[ingredient.category_id] || 1;
}

function estimateProtein(recipe) {
  return Math.round(recipe.ingredient_ids.reduce((sum, id) => {
    return sum + proteinForIngredient(findIngredientById(id));
  }, 0));
}

function detectFlavors(recipe) {
  const text = `${recipe.title} ${recipe.steps.join(" ")} ${recipe.base_seasonings.join(" ")}`;
  for (const rule of KEYWORD_FLAVOR_RULES) {
    if (rule.pattern.test(text)) {
      return rule.labels;
    }
  }

  if (recipe.category === "汤粥") {
    return ["清鲜", "暖胃"];
  }
  if (recipe.category === "甜品") {
    return ["香甜", "绵密"];
  }
  if (recipe.category === "凉菜") {
    return ["清爽", "解腻"];
  }
  return ["家常", "鲜香"];
}

function suitableForRecipe(recipe, calories, flavors) {
  const joined = flavors.join(" ");

  if (recipe.category === "甜品") {
    return ["下午茶", "聚会分享", "想吃甜口的人"];
  }

  if (recipe.category === "汤粥" || joined.includes("清淡") || joined.includes("暖胃")) {
    return ["工作日晚餐", "老人儿童", "想吃清淡的人"];
  }

  if (calories >= 420 || joined.includes("麻辣") || joined.includes("浓香")) {
    return ["重口味爱好者", "下饭场景", "聚餐分享"];
  }

  if (recipe.category === "凉菜") {
    return ["夏日餐桌", "减负晚餐", "需要解腻的人"];
  }

  return ["家常晚餐", "上班族", "新手做饭"];
}

function detectCookingMethod(recipe) {
  const text = `${recipe.title} ${recipe.steps.join(" ")}`;
  const methods = [];

  if (/蒸/.test(text)) {
    methods.push("蒸");
  }
  if (/煮|炖|汤|粥/.test(text)) {
    methods.push("煮/炖");
  }
  if (/炒|爆|煸|滑/.test(text)) {
    methods.push("炒");
  }
  if (/煎/.test(text)) {
    methods.push("煎");
  }
  if (/炸/.test(text)) {
    methods.push("炸");
  }
  if (/烤/.test(text)) {
    methods.push("烤");
  }
  if (/凉拌|拌/.test(text)) {
    methods.push("拌");
  }

  if (methods.length === 0) {
    return "家常快手";
  }
  return Array.from(new Set(methods)).join(" + ");
}

function estimateServings(recipe) {
  if (recipe.category === "汤粥") {
    return "2-3 人份";
  }
  if (recipe.category === "甜品") {
    return "2 人份";
  }
  if (recipe.category === "凉菜") {
    return "2 人份";
  }
  if (recipe.ingredient_ids.length >= 4 || recipe.minutes >= 35) {
    return "3 人份";
  }
  return "2 人份";
}

function buildNutritionCards(recipe, calories, protein) {
  return [
    {
      id: `${recipe.id}-nutrition-calories`,
      label: "热量",
      value: `约 ${calories} kcal / 份`,
    },
    {
      id: `${recipe.id}-nutrition-protein`,
      label: "蛋白",
      value: `约 ${protein}g / 份`,
    },
  ];
}

function uniqueByText(list) {
  const seen = new Set();
  return list.filter((item) => {
    if (!item || !item.text || seen.has(item.text)) {
      return false;
    }
    seen.add(item.text);
    return true;
  });
}

function buildSwapLines(recipe, calories) {
  const swapLines = [];
  const ingredientIds = recipe.ingredient_ids || [];
  const hasSugar = recipe.base_seasonings.some((name) => /糖|蜂蜜/.test(name));
  const hasStarch = ingredientIds.some((id) =>
    ["rice", "noodle", "potato", "sweet_potato", "bread", "mantou", "flour", "glutinous_rice", "vermicelli"].includes(id),
  );

  if (Array.isArray(recipe.swap_options)) {
    recipe.swap_options.forEach((item, index) => {
      if (!item || !item.from || !item.to) {
        return;
      }
      const suffix = item.reason ? `，${item.reason}` : "";
      swapLines.push({
        id: `${recipe.id}-swap-manual-${index}`,
        text: `${item.from}可换成${item.to}${suffix}。`,
      });
    });
  }

  if (ingredientIds.some((id) => ["pork_belly", "pork", "ground_pork", "ribs", "lamb"].includes(id))) {
    swapLines.push({
      id: `${recipe.id}-swap-light`,
      text: "想吃得更轻负担时，可把高脂肉换成鸡胸肉、虾仁或嫩豆腐。",
    });
  }

  if (ingredientIds.includes("beef") && recipe.minutes >= 35) {
    swapLines.push({
      id: `${recipe.id}-swap-beef`,
      text: "赶时间时可把牛腩类食材换成牛里脊或鸡腿肉，出菜更快。",
    });
  }

  if (recipe.category === "汤粥" && ingredientIds.includes("chicken_thigh")) {
    swapLines.push({
      id: `${recipe.id}-swap-soup`,
      text: "想提高蛋白同时减少油脂时，鸡腿可换鸡胸肉，或补半块豆腐一起炖。",
    });
  }

  if (hasSugar) {
    swapLines.push({
      id: `${recipe.id}-swap-sugar`,
      text: "需要更清爽或控糖时，可把糖减半或不额外放糖，用食材本身鲜甜提味。",
    });
  }

  if (hasStarch && calories >= 260) {
    swapLines.push({
      id: `${recipe.id}-swap-starch`,
      text: "想更稳妥控糖时，可把部分土豆或主食减半，补一份豆腐或绿叶菜。",
    });
  }

  return uniqueByText(swapLines).slice(0, 3);
}

function buildConditionAdvice(recipe, calories, protein, flavors) {
  const joined = `${recipe.title} ${recipe.steps.join(" ")} ${recipe.base_seasonings.join(" ")} ${flavors.join(" ")}`;
  const ingredientIds = recipe.ingredient_ids || [];
  const hasSugar = recipe.base_seasonings.some((name) => /糖|蜂蜜|冰糖/.test(name));
  const hasStarch = ingredientIds.some((id) =>
    ["rice", "noodle", "potato", "sweet_potato", "bread", "mantou", "flour", "glutinous_rice", "vermicelli"].includes(id),
  );
  const hasSpicy = /辣|麻|豆瓣酱|辣椒油|花椒/.test(joined);

  const adviceMap = new Map();
  function pushAdvice(key, score, text) {
    const current = adviceMap.get(key);
    if (!current || score > current.score) {
      adviceMap.set(key, {
        id: `${recipe.id}-condition-${key}`,
        key,
        title: key,
        text,
        score,
      });
    }
  }

  if (Array.isArray(recipe.condition_hints)) {
    recipe.condition_hints.forEach((item) => {
      if (!item || !item.key || !item.text) {
        return;
      }
      pushAdvice(item.key, 10, item.text);
    });
  }

  let periodScore = 0;
  if (recipe.category === "汤粥") periodScore += 2;
  if (ingredientIds.includes("ginger")) periodScore += 2;
  if (ingredientIds.some((id) => ["beef", "lamb", "chicken_thigh", "chicken_breast", "egg", "shrimp", "ribs"].includes(id))) {
    periodScore += 2;
  }
  if (recipe.category === "凉菜") periodScore -= 3;
  if (periodScore >= 3) {
    pushAdvice(
      "经期",
      periodScore,
      ingredientIds.includes("ginger") || recipe.category === "汤粥"
        ? "经期更适合温热食用，可保留姜片或略多放 1-2 片，尽量少做成冰凉口感。"
        : "经期时建议少辣少冰镇，搭配一份蛋类或瘦肉会更稳妥。",
    );
  }

  let stomachScore = 0;
  if (recipe.category === "汤粥") stomachScore += 3;
  if (/蒸|炖|煮|汤|粥/.test(joined)) stomachScore += 1;
  if (ingredientIds.some((id) => ["ginger", "egg", "tofu", "firm_tofu"].includes(id))) stomachScore += 1;
  if (hasSpicy) stomachScore -= 2;
  if (recipe.category === "凉菜") stomachScore -= 3;
  if (stomachScore >= 3) {
    pushAdvice(
      "养胃",
      stomachScore,
      hasSpicy
        ? "养胃时把辣椒和刺激性调味减量，尽量煮软一点、少油一些。"
        : "养胃时保持温热少油，食材可切小些、炖软些，口感会更友好。",
    );
  }

  let sugarScore = 0;
  if (recipe.category === "甜品") sugarScore += 3;
  if (hasSugar) sugarScore += 2;
  if (hasStarch) sugarScore += 2;
  if (calories >= 360) sugarScore += 1;
  if (sugarScore >= 3) {
    pushAdvice(
      "控糖",
      sugarScore,
      hasStarch
        ? "控糖时把淀粉类主料减半，优先多配蛋白质和绿叶菜，口味更稳妥。"
        : "控糖时把糖减半或不额外放糖，少勾芡，利用番茄或洋葱自然甜味提味。",
    );
  }

  let trainingScore = 0;
  if (protein >= 20) trainingScore += 3;
  if (protein >= 28) trainingScore += 1;
  if (ingredientIds.some((id) => ["beef", "chicken_breast", "chicken_thigh", "egg", "shrimp", "tofu", "firm_tofu", "yuba"].includes(id))) {
    trainingScore += 1;
  }
  if (recipe.category === "甜品") trainingScore -= 2;
  if (trainingScore >= 3) {
    pushAdvice(
      "力量训练",
      trainingScore,
      protein >= 28
        ? "这道菜本身蛋白不错，力量训练期可直接当主菜，搭配一份绿叶菜更均衡。"
        : "力量训练期可额外加 1 个蛋或一份鸡胸肉/虾仁，把蛋白补得更扎实。",
    );
  }

  const conditionAdvice = Array.from(adviceMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => ({
      id: item.id,
      key: item.key,
      title: item.title,
      text: item.text,
    }));

  return {
    conditionAdvice,
    conditionTags: conditionAdvice.map((item) => item.key),
  };
}

function buildRecipeProfile(recipe, ownedIds) {
  const calories = estimateCalories(recipe);
  const protein = estimateProtein(recipe);
  const flavors = detectFlavors(recipe);
  const suitable = suitableForRecipe(recipe, calories, flavors);
  const cookingMethod = detectCookingMethod(recipe);
  const servingsText = estimateServings(recipe);
  const baseSeasoningLines = buildBaseSeasoningLines(recipe);
  const nutritionCards = buildNutritionCards(recipe, calories, protein);
  const swapLines = buildSwapLines(recipe, calories);
  const { conditionAdvice, conditionTags } = buildConditionAdvice(recipe, calories, protein, flavors);

  const ingredientLines = recipe.ingredient_ids.map((id) => {
    const base = ingredientLine(id);
    const owned = ownedIds.includes(id);
    return {
      id: base.id,
      text: base.text,
      amount: base.amount,
      owned,
      className: owned
        ? "ingredient-pill ingredient-pill-owned"
        : "ingredient-pill ingredient-pill-missing",
    };
  });

  return {
    caloriesText: `约 ${calories} kcal / 份`,
    proteinText: `约 ${protein}g 蛋白 / 份`,
    nutritionCards,
    servingsText,
    cookingMethod,
    flavorTags: flavors,
    suitableTags: suitable,
    swapLines,
    conditionAdvice,
    conditionTags,
    ingredientLines,
    baseSeasoningLines,
  };
}

module.exports = {
  buildRecipeProfile,
};
