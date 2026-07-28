import { useEffect, useMemo, useState } from "react";
import { X, Mail, Send, AlertCircle, ChefHat } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMenuCart, useSettings, useLastSubmission } from "@/store";
import { RECIPES } from "@/data/recipes";
import { formatTime, plusMinutes, formatDateTimeLocal, generateOrderId } from "@/lib/format";
import { sendSubmissionEmail } from "@/lib/email";
import { buildMenuPlan } from "@/lib/menu-plan";
import type { Submission } from "@/types";
import FoodImage from "@/components/FoodImage";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function SendSheet({ open, onClose, onSuccess }: Props) {
  const selectedRecipeIds = useMenuCart((s) => s.selected);
  const clearMenuCart = useMenuCart((s) => s.clear);
  const settings = useSettings((s) => s.settings);
  const setSubmission = useLastSubmission((s) => s.setSubmission);

  const recipes = useMemo(
    () =>
      selectedRecipeIds
        .map((id) => RECIPES.find((r) => r.id === id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r)),
    [selectedRecipeIds],
  );
  const plan = useMemo(() => buildMenuPlan(selectedRecipeIds), [selectedRecipeIds]);

  const defaultTime = useMemo(() => plusMinutes(new Date(), 30), []);

  const [pickupName, setPickupName] = useState("");
  const [pickupTime, setPickupTime] = useState(formatDateTimeLocal(defaultTime));
  const [remark, setRemark] = useState("");
  const [toEmail, setToEmail] = useState(settings.to_email);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) {
      setPickupName("");
      setPickupTime(formatDateTimeLocal(plusMinutes(new Date(), 30)));
      setRemark("");
      setToEmail(settings.to_email);
      setErrorMsg("");
    }
  }, [open, settings.to_email]);

  const canSubmit = recipes.length > 0 && toEmail.trim() && !submitting;

  const handleSubmit = async () => {
    setErrorMsg("");
    if (recipes.length === 0) {
      setErrorMsg("还没有选择菜谱");
      return;
    }
    if (!toEmail.trim()) {
      setErrorMsg("请先在「设置」里配置收单邮箱");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail.trim())) {
      setErrorMsg("收单邮箱格式不正确");
      return;
    }

    setSubmitting(true);
    const submission: Submission = {
      id: generateOrderId(),
      recipe_ids: selectedRecipeIds,
      ingredient_ids: plan.ingredients.map((item) => item.ingredient.id),
      pickup_name: pickupName.trim(),
      pickup_time: pickupTime.replace("T", " "),
      remark: remark.trim(),
      to_email: toEmail.trim(),
      created_at: formatTime(new Date()),
    };

    try {
      const result = await sendSubmissionEmail(submission, {
        ...settings,
        to_email: toEmail.trim(),
      });
      if (result.ok === false) {
        setErrorMsg(result.error || "发送失败，请稍后重试");
        return;
      }
      setSubmission(submission);
      clearMenuCart();
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-ink/40 z-40"
            onClick={submitting ? undefined : onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 bg-cream rounded-t-3xl max-h-[90dvh] flex flex-col
                       sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto
                       sm:w-[min(92vw,640px)] sm:max-h-[80dvh]
                       sm:-translate-x-1/2 sm:-translate-y-1/2
                       sm:rounded-3xl sm:border sm:border-ink/5 sm:shadow-2xl"
            initial={{ y: "100%", opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div className="px-5 pt-3 pb-3">
              <div className="w-10 h-1 bg-ink/15 rounded-full mx-auto sm:hidden" />
              <div className="flex items-center justify-between mt-3">
                <div>
                  <div className="font-serif text-[18px] text-ink font-semibold">
                    发送采购清单
                  </div>
                  <div className="text-[11px] text-fog mt-0.5">
                    自动附带已选菜谱与主食材清单
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="w-7 h-7 rounded-full bg-ink/5 text-ink flex items-center justify-center hover:bg-ink/10 disabled:opacity-50"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-4 space-y-4 sm:px-4">
              <section>
                <SectionTitle>本次选中的菜谱</SectionTitle>
                {recipes.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-ink/5 px-3 py-6 text-center text-fog text-sm">
                    还没有挑菜谱
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-ink/5 divide-y divide-ink/5">
                    {recipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="flex items-center gap-3 px-2 py-2"
                      >
                        <div className="w-11 h-11 rounded-xl bg-cream-soft shrink-0 overflow-hidden">
                          <FoodImage
                            id={recipe.id}
                            type="recipe"
                            fallback={recipe.emoji}
                            alt={recipe.title}
                            className="rounded-xl"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-ink font-serif font-semibold truncate flex items-center gap-1.5">
                            <ChefHat size={12} className="text-brand" />
                            {recipe.title}
                          </div>
                          <div className="text-[11px] text-fog num mt-0.5">
                            {recipe.minutes} 分钟 · {recipe.difficulty}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between px-1 mt-2">
                  <span className="text-[12px] text-fog">共 {recipes.length} 道</span>
                </div>
              </section>

              <section>
                <SectionTitle>自动汇总的主食材</SectionTitle>
                {plan.ingredients.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-ink/5 px-3 py-6 text-center text-fog text-sm">
                    当前菜谱没有主食材
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-ink/5 divide-y divide-ink/5">
                    {plan.ingredients.map((item) => (
                      <div
                        key={item.ingredient.id}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <div className="w-11 h-11 rounded-xl bg-cream-soft shrink-0 overflow-hidden">
                          <FoodImage
                            id={item.ingredient.id}
                            fallback={item.ingredient.emoji}
                            alt={item.ingredient.name}
                            className="rounded-xl"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-ink font-serif font-semibold truncate">
                            {item.ingredient.name}
                          </div>
                          <div className="text-[11px] text-fog mt-0.5 line-clamp-1">
                            用于 {item.recipes.map((recipe) => recipe.title).join("、")}
                          </div>
                        </div>
                        <div className="text-[11px] text-brand font-semibold num">
                          x{item.count}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <SectionTitle>用餐信息（可选）</SectionTitle>
                <Field
                  label="联系人"
                  placeholder="例：张阿姨"
                  value={pickupName}
                  onChange={setPickupName}
                />
                <Field
                  label="用餐时间"
                  type="datetime-local"
                  value={pickupTime}
                  onChange={setPickupTime}
                />
                <Field
                  label="备注"
                  placeholder="少油 / 不辣 / 多加葱花…"
                  value={remark}
                  onChange={setRemark}
                />
                <Field
                  label={
                    <span className="flex items-center gap-1">
                      <Mail size={12} /> 收单邮箱
                    </span>
                  }
                  type="email"
                  placeholder="chef@example.com"
                  value={toEmail}
                  onChange={setToEmail}
                />
                <p className="text-[11px] text-fog -mt-1 leading-relaxed">
                  清单确认后，邮件会发到该邮箱。未配置 EmailJS 时会唤起系统邮件 App。
                </p>
              </section>

              {errorMsg && (
                <div className="flex items-start gap-2 text-[12px] text-red-600 bg-red-50 rounded-xl px-3 py-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <div className="px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] border-t border-ink/5 bg-white/80 backdrop-blur sm:px-4 sm:pb-4">
              <button
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="btn-primary w-full h-12 text-[15px] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    正在发送邮件…
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    发送采购清单
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] text-fog tracking-widest mb-2 px-1">
      {children}
    </div>
  );
}

type FieldProps = {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
};

function Field({ label, value, onChange, placeholder, type = "text" }: FieldProps) {
  return (
    <label className="block">
      <span className="text-[12px] text-ink-soft block mb-1.5 px-1">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-3 rounded-xl bg-white border border-ink/10 text-[14px] text-ink outline-none focus:border-brand transition"
      />
    </label>
  );
}
