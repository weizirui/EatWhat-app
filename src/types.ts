import type { IngredientCategory, Ingredient } from "@/data/ingredients";
import type { Recipe } from "@/data/recipes";

export type { IngredientCategory, Ingredient, Recipe };

/** 用户在「菜谱清单」中选中的菜谱 id 列表 */
export type RecipeSelection = string[];

/** 一次发送的清单：已选菜谱 + 自动汇总出的主食材 */
export type Submission = {
  id: string;
  recipe_ids: string[];
  /** 根据所选菜谱自动汇总出的主食材 id */
  ingredient_ids: string[];
  pickup_name: string;
  pickup_time: string;
  remark: string;
  to_email: string;
  created_at: string;
};

export type EmailJsConfig = {
  serviceId: string;
  templateId: string;
  publicKey: string;
};

export type Settings = {
  to_email: string;
  subject_prefix: string;
  emailjs: EmailJsConfig | null;
};
