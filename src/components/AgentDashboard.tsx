"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ConfigStatus = {
  isConfigured: boolean;
  hasAccessToken: boolean;
  hasPhoneNumberId: boolean;
  hasVerifyToken: boolean;
  graphVersion: string;
};

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  to: string | null;
  from: string | null;
  body: string;
  status?: string;
  createdAt: string;
};

type AutomationRule = {
  id: string;
  name: string;
  triggerType: "keyword" | "contains" | "fallback";
  triggerValue: string;
  response: string;
  active: boolean;
};

const rulesStorageKey = "whatsapp-agent.rules";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function loadStoredRules(): AutomationRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(rulesStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AutomationRule[];
    return parsed;
  } catch {
    return [];
  }
}

function persistRules(rules: AutomationRule[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(rulesStorageKey, JSON.stringify(rules));
}

export function AgentDashboard({
  config,
}: {
  config: ConfigStatus;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sendState, setSendState] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState(
    "Hi {{name}}, this is your WhatsApp agent. How can I help today?",
  );
  const [templateName, setTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("en_US");
  const [templateVariables, setTemplateVariables] = useState<string[]>([""]);
  const [templateState, setTemplateState] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [newRule, setNewRule] = useState<Omit<AutomationRule, "id" | "active">>({
    name: "Welcome flow",
    triggerType: "keyword",
    triggerValue: "hi",
    response:
      "Hello! I'm an automated agent. Let me know if you need support, sales, or something else.",
  });

  const fetchMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch("/api/messages");
      const data = await response.json();
      setMessages(data.messages ?? []);
    } catch {
      // ignore network errors for polling
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    setRules(loadStoredRules());
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = window.setInterval(fetchMessages, 10_000);
    return () => window.clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (rules.length) {
      persistRules(rules);
    } else {
      persistRules([]);
    }
  }, [rules]);

  const isReadyToSend = useMemo(
    () => recipient.trim().length >= 6 && message.trim().length > 0,
    [recipient, message],
  );

  const handleSendMessage = async () => {
    if (!isReadyToSend) return;
    setSendState("sending");
    setSendError(null);

    try {
      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: recipient,
          type: "text",
          body: message,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Failed to send message.");
      }

      await fetchMessages();
      setSendState("success");
      setMessage("");
      window.setTimeout(() => setSendState("idle"), 2000);
    } catch (error) {
      setSendState("error");
      setSendError(
        error instanceof Error ? error.message : "Unable to send message.",
      );
    }
  };

  const handleTemplateSend = async () => {
    if (!recipient.trim() || !templateName.trim()) return;

    setTemplateState("sending");
    setTemplateError(null);

    try {
      const bodyVariables = templateVariables
        .filter((text) => text.trim().length > 0)
        .map((text) => ({ type: "text", text }));

      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          type: "template",
          templateName,
          languageCode: templateLanguage,
          components: bodyVariables.length
            ? [{ type: "body", parameters: bodyVariables }]
            : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Failed to send template.");
      }

      await fetchMessages();
      setTemplateState("success");
      window.setTimeout(() => setTemplateState("idle"), 2000);
    } catch (error) {
      setTemplateState("error");
      setTemplateError(
        error instanceof Error ? error.message : "Unable to send template.",
      );
    }
  };

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, active: !rule.active } : rule,
      ),
    );
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const addRule = () => {
    const rule: AutomationRule = {
      id: createId(),
      active: true,
      ...newRule,
    };
    setRules((prev) => [rule, ...prev]);
    setShowRuleForm(false);
  };

  const simInboundMessage = async (text: string) => {
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: createId(),
        direction: "inbound",
        to: null,
        from: "customer",
        body: text,
        createdAt: new Date().toISOString(),
      }),
    });

    fetchMessages();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-12 text-slate-100 lg:px-12">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-xl shadow-cyan-500/10 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-cyan-300/80">
              Agent Console
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">
              Build & monitor your WhatsApp automation
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300/80">
              Send broadcasts, design auto-replies, and keep a pulse on every
              conversation with the WhatsApp Cloud API.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-6 py-4 text-sm text-cyan-100">
            <p className="font-semibold uppercase tracking-wide">Status</p>
            <p className="mt-1 text-lg font-bold">
              {config.isConfigured ? "Ready" : "Setup required"}
            </p>
            <p className="mt-1 text-xs text-cyan-200/70">
              Graph version: {config.graphVersion}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-semibold text-white">Connection setup</h2>
          <p className="mt-2 text-sm text-slate-300">
            Provide a permanent token and phone number ID from Meta Developer
            Console. Add them to your project environment variables before
            deploying.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            <li>
              <span className="font-medium text-white">WHATSAPP_ACCESS_TOKEN:</span>{" "}
              {config.hasAccessToken ? "Detected" : "Missing"}
            </li>
            <li>
              <span className="font-medium text-white">WHATSAPP_PHONE_NUMBER_ID:</span>{" "}
              {config.hasPhoneNumberId ? "Detected" : "Missing"}
            </li>
            <li>
              <span className="font-medium text-white">WHATSAPP_VERIFY_TOKEN:</span>{" "}
              {config.hasVerifyToken ? "Detected" : "Missing"}
            </li>
          </ul>
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-slate-300">
            <p className="font-semibold text-white">Webhook URL</p>
            <code className="mt-2 block overflow-hidden text-ellipsis rounded-lg bg-black/40 px-3 py-2 text-[11px] text-cyan-200">
              https://agentic-ac84c8a7.vercel.app/api/webhook
            </code>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              Use the verify token above when configuring the webhook in the
              WhatsApp Cloud API dashboard. Incoming messages will populate the
              activity feed automatically.
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-semibold text-white">
            Quick proactive message
          </h2>
          <div className="mt-4 space-y-4">
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Recipient (E.164 format)
              <input
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="+919999999999"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none ring-cyan-500/40 transition focus:ring-2"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Message body
              <textarea
                value={message}
                rows={4}
                onChange={(event) => setMessage(event.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-cyan-500/40 transition focus:ring-2"
              />
            </label>
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!isReadyToSend || sendState === "sending"}
              className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-500/60"
            >
              {sendState === "sending" ? "Sending…" : "Send via WhatsApp"}
            </button>
            {sendState === "error" && sendError ? (
              <p className="text-xs text-rose-300">{sendError}</p>
            ) : null}
            {sendState === "success" ? (
              <p className="text-xs text-emerald-300">
                Message dispatched successfully.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">Template send</h2>
            <button
              type="button"
          onClick={() =>
            setTemplateVariables((prev) => [...prev, ""])
          }
              className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-200 transition hover:border-cyan-300 hover:text-white"
            >
              + Variable
            </button>
          </div>
          <div className="mt-4 space-y-4">
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Template name
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="order_update"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none ring-cyan-500/40 transition focus:ring-2"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Language code
              <input
                value={templateLanguage}
                onChange={(event) => setTemplateLanguage(event.target.value)}
                placeholder="en_US"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none ring-cyan-500/40 transition focus:ring-2"
              />
            </label>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Body variables
              </p>
              {templateVariables.map((value, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={value}
                    onChange={(event) =>
                      setTemplateVariables((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item,
                        ),
                      )
                    }
                    placeholder={`Variable ${index + 1}`}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none ring-cyan-500/40 transition focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setTemplateVariables((prev) =>
                        prev.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:border-rose-400 hover:text-rose-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleTemplateSend}
              disabled={templateState === "sending" || !templateName.trim()}
              className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-500/60"
            >
              {templateState === "sending" ? "Sending…" : "Send template"}
            </button>
            {templateState === "error" && templateError ? (
              <p className="text-xs text-rose-300">{templateError}</p>
            ) : null}
            {templateState === "success" ? (
              <p className="text-xs text-emerald-300">
                Template sent successfully.
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Automation designer
            </h2>
            <button
              type="button"
              onClick={() => setShowRuleForm((value) => !value)}
              className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-200 transition hover:border-cyan-300 hover:text-white"
            >
              {showRuleForm ? "Close" : "Add rule"}
            </button>
          </div>
          {showRuleForm ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm">
              <label className="flex flex-col gap-1 text-slate-200">
                Rule name
                <input
                  value={newRule.name}
                  onChange={(event) =>
                    setNewRule((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:ring-cyan-400/60"
                />
              </label>

              <label className="flex flex-col gap-1 text-slate-200">
                Trigger type
                <select
                  value={newRule.triggerType}
                  onChange={(event) =>
                    setNewRule((current) => ({
                      ...current,
                      triggerType: event.target.value as AutomationRule["triggerType"],
                    }))
                  }
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:ring-cyan-400/60"
                >
                  <option value="keyword">Matches keyword</option>
                  <option value="contains">Contains phrase</option>
                  <option value="fallback">Fallback</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-slate-200">
                Trigger value
                <input
                  value={newRule.triggerValue}
                  onChange={(event) =>
                    setNewRule((current) => ({
                      ...current,
                      triggerValue: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:ring-cyan-400/60"
                  placeholder="hi"
                />
              </label>

              <label className="flex flex-col gap-1 text-slate-200">
                Automated response
                <textarea
                  value={newRule.response}
                  rows={3}
                  onChange={(event) =>
                    setNewRule((current) => ({
                      ...current,
                      response: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:ring-cyan-400/60"
                />
              </label>

              <button
                type="button"
                onClick={addRule}
                className="w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                Save rule
              </button>
            </div>
          ) : null}

          <ul className="mt-5 space-y-3">
            {rules.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                No automation rules yet. Create one to auto-respond to new
                conversations.
              </li>
            ) : (
              rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{rule.name}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {rule.triggerType === "keyword"
                          ? "Matches keyword"
                          : rule.triggerType === "contains"
                            ? "Contains phrase"
                            : "Fallback"}
                        : <span className="text-slate-200">{rule.triggerValue}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRule(rule.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          rule.active
                            ? "bg-emerald-500/90 text-emerald-950"
                            : "bg-slate-600/50 text-slate-100"
                        }`}
                      >
                        {rule.active ? "Active" : "Paused"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRule(rule.id)}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 transition hover:border-rose-400 hover:text-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-200">
                    {rule.response}
                  </p>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Conversation activity
            </h2>
            <p className="text-sm text-slate-300">
              Live feed combining inbound and outbound interactions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchMessages}
              className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-200 transition hover:border-cyan-300 hover:text-white"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => simInboundMessage("Hi, I'd like to know my order status.")}
              className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-200 transition hover:border-emerald-300 hover:text-white"
            >
              Simulate inbound
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {messages.length === 0 ? (
            <div className="col-span-2 rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-slate-300">
              No messages yet. Send a proactive message or connect your webhook.
            </div>
          ) : (
            messages.map((messageItem) => (
              <article
                key={messageItem.id}
                className={`flex flex-col gap-2 rounded-2xl border border-white/10 p-4 ${
                  messageItem.direction === "inbound"
                    ? "bg-emerald-500/10"
                    : "bg-cyan-500/10"
                }`}
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-300">
                  <span>{messageItem.direction === "inbound" ? "Inbound" : "Outbound"}</span>
                  <span>
                    {new Date(messageItem.createdAt).toLocaleString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-100">{messageItem.body}</p>
                <p className="text-xs text-slate-400">
                  {messageItem.direction === "inbound"
                    ? `From ${messageItem.from ?? "unknown"}`
                    : `To ${messageItem.to ?? "unknown"}`}
                  {messageItem.status ? ` • ${messageItem.status}` : ""}
                </p>
              </article>
            ))
          )}
        </div>
        {isLoadingMessages ? (
          <p className="mt-4 text-center text-xs text-slate-400">
            Updating activity…
          </p>
        ) : null}
      </section>
    </main>
  );
}
