import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, KeyRound, FileText, Save, Info, ExternalLink } from "lucide-react";
import { useSettings } from "@/store";
import { motion } from "framer-motion";

export default function Settings() {
  const navigate = useNavigate();
  const { settings, update, reset } = useSettings();

  const [toEmail, setToEmail] = useState(settings.to_email);
  const [subjectPrefix, setSubjectPrefix] = useState(settings.subject_prefix);
  const [serviceId, setServiceId] = useState(settings.emailjs?.serviceId ?? "");
  const [templateId, setTemplateId] = useState(settings.emailjs?.templateId ?? "");
  const [publicKey, setPublicKey] = useState(settings.emailjs?.publicKey ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setToEmail(settings.to_email);
    setSubjectPrefix(settings.subject_prefix);
    setServiceId(settings.emailjs?.serviceId ?? "");
    setTemplateId(settings.emailjs?.templateId ?? "");
    setPublicKey(settings.emailjs?.publicKey ?? "");
  }, [settings]);

  const onSave = () => {
    update({
      to_email: toEmail.trim(),
      subject_prefix: subjectPrefix.trim() || "【轻享点餐】新菜谱",
      emailjs:
        serviceId && templateId && publicKey
          ? { serviceId, templateId, publicKey }
          : null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="h-full w-full flex flex-col bg-cream">
      <div className="px-4 py-3 hairline bg-cream flex items-center gap-2">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-full border border-ink/10 text-ink flex items-center justify-center hover:border-ink/30 active:scale-95"
          aria-label="返回"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="font-serif text-[15px] text-ink font-semibold flex-1 text-center -ml-9">
          设置
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-5">
        {/* 收单邮箱 */}
        <Section title="收单邮箱" desc="订单会自动发到此邮箱">
          <InputWrap icon={<Mail size={14} />}>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="chef@example.com"
              className="w-full bg-transparent text-[14px] outline-none text-ink"
            />
          </InputWrap>
          <InputWrap icon={<FileText size={14} />}>
            <input
              value={subjectPrefix}
              onChange={(e) => setSubjectPrefix(e.target.value)}
              placeholder="邮件主题前缀"
              className="w-full bg-transparent text-[14px] outline-none text-ink"
            />
          </InputWrap>
        </Section>

        {/* EmailJS 配置 */}
        <Section
          title="EmailJS 配置（可选）"
          desc="配置后无需后端即可直发邮件；未配置时将降级唤起系统邮件 App"
        >
          <InputWrap icon={<KeyRound size={14} />}>
            <input
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              placeholder="Service ID（service_xxx）"
              className="w-full bg-transparent text-[14px] outline-none text-ink"
            />
          </InputWrap>
          <InputWrap icon={<KeyRound size={14} />}>
            <input
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="Template ID（template_xxx）"
              className="w-full bg-transparent text-[14px] outline-none text-ink"
            />
          </InputWrap>
          <InputWrap icon={<KeyRound size={14} />}>
            <input
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="Public Key（user_xxx）"
              className="w-full bg-transparent text-[14px] outline-none text-ink"
            />
          </InputWrap>
          <a
            href="https://www.emailjs.com/"
            target="_blank"
            rel="noreferrer"
            className="text-[12px] text-brand flex items-center gap-1 mt-1"
          >
            <Info size={12} />
            如何获取这三项？
            <ExternalLink size={11} />
          </a>
        </Section>

        {/* 关于 */}
        <Section title="关于" desc="">
          <div className="text-[12px] text-ink-soft leading-relaxed bg-white rounded-2xl border border-ink/5 p-4">
            <p>
              轻享点餐是一款极简的 H5 点餐应用，参考朴朴小程序的骨架，
              <b className="text-ink">去掉了支付与地址</b>，点完即下，
              自动发邮件给指定接收人，并附赠适配的菜谱。
            </p>
            <p className="mt-2">
              本应用为纯前端，数据保存在本地浏览器（localStorage），不会上传到任何服务器。
            </p>
          </div>
        </Section>
      </div>

      <div className="px-5 pt-3 pb-5 border-t border-ink/5 bg-white/80 backdrop-blur flex items-center gap-3">
        <button
          onClick={() => {
            if (confirm("确认重置所有设置？")) {
              reset();
            }
          }}
          className="btn-ghost h-11 px-4 text-[13px]"
        >
          重置
        </button>
        <button
          onClick={onSave}
          className="btn-primary flex-1 h-11 text-[14px] flex items-center justify-center gap-2 relative"
        >
          <Save size={15} />
          {saved ? "已保存" : "保存设置"}
          {saved && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ink text-white text-[10px] flex items-center justify-center"
            >
              ✓
            </motion.span>
          )}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="px-1 mb-2">
        <div className="font-serif text-[13px] text-ink font-semibold">
          {title}
        </div>
        {desc && <div className="text-[11px] text-fog mt-0.5">{desc}</div>}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function InputWrap({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="h-11 px-3 rounded-xl bg-white border border-ink/10 flex items-center gap-2 focus-within:border-brand transition">
      <span className="text-fog">{icon}</span>
      {children}
    </div>
  );
}
