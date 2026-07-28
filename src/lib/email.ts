import emailjs from "@emailjs/browser";
import { RECIPES, type Recipe } from "@/data/recipes";
import { INGREDIENTS } from "@/data/ingredients";
import type { Settings, Submission } from "@/types";

function ingName(id: string): string {
  return INGREDIENTS.find((i) => i.id === id)?.name ?? id;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function recipeBlock(r: Recipe, ownedIds: Set<string>): string {
  const ownedMain = r.ingredient_ids
    .map((id) => {
      const owned = ownedIds.has(id);
      const name = escape(ingName(id));
      return owned
        ? `<span style="color:#2F4A3A;">${name}</span>`
        : `<span style="color:#E5531B;text-decoration:line-through;opacity:0.7;">${name}</span>`;
    })
    .join("、");

  const base = r.base_seasonings.map(escape).join("、");

  const steps = r.steps
    .map(
      (s, i) =>
        `<li style="margin-bottom:4px;"><b style="color:#FF6A2C;">${i + 1}.</b> ${escape(s)}</li>`,
    )
    .join("");

  return `
  <div style="border:1px solid #f0e9dc;border-radius:14px;padding:14px 16px;margin-bottom:14px;background:#ffffff;">
    <div style="display:flex;align-items:baseline;gap:8px;">
      <span style="font-size:22px;">${r.emoji}</span>
      <span style="font-family:'PingFang SC',serif;font-size:17px;font-weight:600;color:#2F4A3A;">${escape(r.title)}</span>
      <span style="margin-left:auto;color:#9AA0A6;font-size:11px;">${r.minutes} 分钟 · ${escape(r.difficulty)}</span>
    </div>
    <div style="margin-top:10px;font-size:13px;color:#2F4A3A;line-height:1.7;">
      <div><b style="color:#9AA0A6;font-weight:500;">主食材：</b>${ownedMain}</div>
      <div style="color:#9AA0A6;font-size:12px;margin-top:3px;">辅料（家中常备）：${base}</div>
    </div>
    <ol style="margin:12px 0 0;padding-left:20px;font-size:13px;color:#2F4A3A;line-height:1.8;">${steps}</ol>
    <div style="margin-top:10px;background:#FFF3EC;border-radius:10px;padding:8px 12px;font-size:12px;color:#2F4A3A;">
      <b style="color:#FF6A2C;">💡</b> ${escape(r.tip)}
    </div>
  </div>
  `;
}

export function buildSubmissionHtml(s: Submission): string {
  const owned = new Set(s.ingredient_ids);
  const recipes = s.recipe_ids
    .map((id) => RECIPES.find((r) => r.id === id))
    .filter((r): r is Recipe => Boolean(r));

  const recipesHtml = recipes.map((r) => recipeBlock(r, owned)).join("");

  return `
  <div style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#FAF7F2;padding:24px;color:#2F4A3A;">
    <div style="max-width:600px;margin:0 auto;">
      <div style="background:#FF6A2C;color:#fff;padding:18px 24px;border-radius:16px 16px 0 0;">
        <div style="font-size:12px;letter-spacing:2px;opacity:0.85;">采购清单 · ${escape(s.created_at)}</div>
        <div style="font-size:20px;font-weight:600;margin-top:4px;">编号 ${escape(s.id)}</div>
      </div>
      <div style="background:#ffffff;padding:18px 22px;border-left:1px solid #f0e9dc;border-right:1px solid #f0e9dc;font-size:13px;line-height:1.9;">
        <div><span style="color:#9AA0A6;display:inline-block;width:80px;">收件人</span>${escape(s.to_email)}</div>
        ${s.pickup_name ? `<div><span style="color:#9AA0A6;display:inline-block;width:80px;">取餐人</span>${escape(s.pickup_name)}</div>` : ""}
        ${s.pickup_time ? `<div><span style="color:#9AA0A6;display:inline-block;width:80px;">用餐时间</span>${escape(s.pickup_time)}</div>` : ""}
        ${s.remark ? `<div><span style="color:#9AA0A6;display:inline-block;width:80px;">备注</span>${escape(s.remark)}</div>` : ""}
      </div>
      <div style="background:#ffffff;padding:8px 22px 16px;border-left:1px solid #f0e9dc;border-right:1px solid #f0e9dc;">
        <div style="font-size:11px;color:#9AA0A6;letter-spacing:1px;padding:8px 0;">本次发送 ${recipes.length} 道菜谱与配套主食材</div>
        ${recipesHtml}
      </div>
      <div style="background:#FAF7F2;padding:14px 24px;text-align:center;font-size:12px;color:#9AA0A6;border-radius:0 0 16px 16px;border:1px solid #f0e9dc;border-top:none;">
        本邮件由「轻享点餐」小程序自动发出
      </div>
    </div>
  </div>
  `;
}

export function buildSubmissionText(s: Submission): string {
  const owned = new Set(s.ingredient_ids);
  const recipes = s.recipe_ids
    .map((id) => RECIPES.find((r) => r.id === id))
    .filter((r): r is Recipe => Boolean(r));

  const lines: string[] = [
    `【轻享点餐】采购清单 ${s.id}`,
    `时间：${s.created_at}`,
    ``,
    `收件人：${s.to_email}`,
    s.pickup_name ? `取餐人：${s.pickup_name}` : "",
    s.pickup_time ? `用餐时间：${s.pickup_time}` : "",
    s.remark ? `备注：${s.remark}` : "",
    ``,
    `本次发送 ${recipes.length} 道菜谱：`,
    ``,
  ].filter((x) => x !== "");

  if (s.ingredient_ids.length > 0) {
    lines.push(`主食材清单：${s.ingredient_ids.map(ingName).join("、")}`);
    lines.push(``);
  }

  recipes.forEach((r, idx) => {
    lines.push(`【${idx + 1}】${r.emoji} ${r.title}  ·  ${r.minutes} 分钟  ·  ${r.difficulty}`);
    const ownedMain = r.ingredient_ids.map((id) => {
      const ok = owned.has(id);
      return `${ok ? "✓" : "✗"}${ingName(id)}`;
    });
    lines.push(`主食材：${ownedMain.join("、")}`);
    lines.push(`辅料：${r.base_seasonings.join("、")}`);
    lines.push(`做法：`);
    r.steps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    lines.push(`小贴士：${r.tip}`);
    lines.push(``);
  });

  return lines.join("\n");
}

export type SendResult =
  | { ok: true; channel: "emailjs" | "mailto"; fallbackReason?: string }
  | { ok: false; channel: "emailjs" | "mailto"; error: string };

export async function sendSubmissionEmail(
  submission: Submission,
  settings: Settings,
): Promise<SendResult> {
  const subject = `${settings.subject_prefix || "【轻享点餐】采购清单"} ${submission.id}`;

  if (
    settings.emailjs?.serviceId &&
    settings.emailjs?.templateId &&
    settings.emailjs?.publicKey
  ) {
    try {
      await emailjs.send(
        settings.emailjs.serviceId,
        settings.emailjs.templateId,
        {
          to_email: submission.to_email,
          subject,
          order_id: submission.id,
          pickup_name: submission.pickup_name,
          pickup_time: submission.pickup_time,
          remark: submission.remark || "（无）",
          items_html: buildSubmissionHtml(submission),
          total_qty: submission.recipe_ids.length,
          recipe_hint: `已为你整理 ${submission.recipe_ids.length} 道菜谱及采购主食材，请在 App 内查看。`,
        },
        { publicKey: settings.emailjs.publicKey },
      );
      return { ok: true, channel: "emailjs" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const link = buildMailtoLink(submission, settings, subject);
      window.location.href = link;
      return { ok: true, channel: "mailto", fallbackReason: msg };
    }
  }

  if (!submission.to_email) {
    return { ok: false, channel: "mailto", error: "尚未配置收单邮箱" };
  }
  const link = buildMailtoLink(submission, settings, subject);
  window.location.href = link;
  return { ok: true, channel: "mailto" };
}

function buildMailtoLink(s: Submission, settings: Settings, subject: string) {
  const body = buildSubmissionText(s);
  const to = settings.to_email || s.to_email;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
