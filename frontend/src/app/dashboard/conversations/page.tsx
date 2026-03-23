"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { operationsFetch } from "../../../lib/operations";
import { useLanguage } from "../../../components/providers/LanguageProvider";

type ConversationItem = {
  id: string;
  customer_handle?: string;
  customer_name?: string;
  last_message?: string;
  timestamp?: string;
  unread_count: number;
  taken_over: boolean;
  sentiment?: "positive" | "neutral" | "negative";
  assigned_employee_id?: number | null;
};

type ConversationMessage = {
  id: number;
  sender_type: "customer" | "ai" | "human";
  content: string;
  confidence: number | null;
  created_at: string;
  low_confidence: boolean;
  sentiment?: "positive" | "neutral" | "negative";
};

type MonitoringMetrics = {
  estimated_satisfaction_score: number;
  resolution_quality_score: number;
  escalation_risk: "High" | "Medium" | "Low";
  takeover_recommended: boolean;
};

type ConversationsResponse = {
  conversations: ConversationItem[];
};

type ConversationDetailResponse = {
  conversation: ConversationItem;
  messages: ConversationMessage[];
  monitoring?: MonitoringMetrics;
};

export default function ConversationsPage() {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [trainingTarget, setTrainingTarget] = useState<ConversationMessage | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [monitoring, setMonitoring] = useState<MonitoringMetrics | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const loadConversations = async (preferredConversationId?: string) => {
    const data = await operationsFetch<ConversationsResponse>("/operations/conversations");
    setConversations(data.conversations || []);

    if ((data.conversations || []).length === 0) {
      setActiveConversationId(null);
      setMessages([]);
      return;
    }

    if (preferredConversationId && data.conversations.some((item) => item.id === preferredConversationId)) {
      setActiveConversationId(preferredConversationId);
      return;
    }

    setActiveConversationId((previous) => {
      if (previous && data.conversations.some((item) => item.id === previous)) {
        return previous;
      }
      return data.conversations[0].id;
    });
  };

  const loadConversationDetail = async (conversationId: string) => {
    const data = await operationsFetch<ConversationDetailResponse>(`/operations/conversations/${conversationId}`);
    setMessages(data.messages || []);
    setMonitoring(data.monitoring || null);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadConversations();
      } catch {
        setErrorText(t.conversationsPage.loadConversationsError);
      }
    };
    void run();
  }, [t.conversationsPage.loadConversationsError]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    void loadConversationDetail(activeConversationId).catch(() => {
      setErrorText(t.conversationsPage.loadSelectedConversationError);
    });
  }, [activeConversationId, t.conversationsPage.loadSelectedConversationError]);

  const onToggleTakeover = async (active: boolean) => {
    if (!activeConversationId) {
      return;
    }
    setErrorText(null);

    try {
      await operationsFetch(`/operations/conversations/${activeConversationId}/takeover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active }),
      });
      await loadConversations(activeConversationId);
      await loadConversationDetail(activeConversationId);
    } catch {
      setErrorText(t.conversationsPage.updateTakeoverError);
    }
  };

  const onSendHumanReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeConversationId) {
      return;
    }

    const text = replyText.trim();
    if (!text) {
      return;
    }

    try {
      await operationsFetch(`/operations/conversations/${activeConversationId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });
      setReplyText("");
      await loadConversations(activeConversationId);
      await loadConversationDetail(activeConversationId);
    } catch {
      setErrorText(t.conversationsPage.sendReplyError);
    }
  };

  const onSaveCorrection = async () => {
    if (!activeConversationId) {
      return;
    }

    const text = correctionText.trim();
    if (!text) {
      return;
    }

    try {
      await operationsFetch(`/operations/conversations/${activeConversationId}/correct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ corrected_answer: text }),
      });
      setCorrectionText("");
      setTrainingTarget(null);
      await loadConversations(activeConversationId);
      await loadConversationDetail(activeConversationId);
    } catch {
      setErrorText(t.conversationsPage.saveCorrectionError);
    }
  };

  const onFeedback = async (message: ConversationMessage, feedbackType: "correct" | "needs_improvement" | "incorrect") => {
    if (!activeConversationId) {
      return;
    }

    try {
      await operationsFetch(`/operations/conversations/${activeConversationId}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message_id: message.id,
          feedback_type: feedbackType,
          suggested_answer: feedbackType === "incorrect" ? correctionText.trim() || undefined : undefined,
        }),
      });
      if (feedbackType === "correct") {
        setErrorText(t.conversationsPage.feedbackSavedCorrect);
      } else if (feedbackType === "needs_improvement") {
        setErrorText(t.conversationsPage.feedbackSavedNeedsImprovement);
      } else {
        setErrorText(t.conversationsPage.feedbackSavedTraining);
      }
    } catch {
      setErrorText(t.conversationsPage.feedbackSubmitError);
    }
  };

  return (
    <section className="animate-fade-in mx-auto max-w-7xl">
      <header data-reveal className="scroll-reveal mb-5 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-300/10 to-[#121a31] p-5">
        <h1 className="text-3xl font-bold text-white">{t.conversationsPage.title}</h1>
        <p className="mt-2 text-sm text-slate-300">{t.conversationsPage.subtitle}</p>
      </header>

      {errorText ? <p className="mb-3 text-sm text-rose-300">{errorText}</p> : null}

      {monitoring ? (
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <MetricBadge label={t.conversationsPage.metricEstimatedSatisfaction} value={`${monitoring.estimated_satisfaction_score.toFixed(1)} / 5`} />
          <MetricBadge label={t.conversationsPage.metricAnswerAccuracy} value={`${monitoring.resolution_quality_score}%`} />
          <MetricBadge label={t.conversationsPage.metricEscalationRisk} value={monitoring.escalation_risk} risk={monitoring.escalation_risk} />
          <MetricBadge
            label={t.conversationsPage.metricAction}
            value={monitoring.takeover_recommended ? t.conversationsPage.metricActionTakeover : t.conversationsPage.metricActionAiContinue}
            risk={monitoring.takeover_recommended ? "High" : "Low"}
          />
        </div>
      ) : null}

      <div className="grid min-h-[70vh] gap-4 md:grid-cols-[320px,1fr]">
        <aside data-reveal className="scroll-reveal card-premium rounded-2xl p-4 backdrop-blur-xl">
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveConversationId(conversation.id)}
                  className={`button-pop w-full rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-cyan-300/35 bg-cyan-300/10"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {conversation.customer_handle || conversation.customer_name || t.conversationsPage.customerFallback}
                    </p>
                    <span className="text-[11px] text-slate-400">{conversation.timestamp || t.conversationsPage.now}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-300">
                    {t.conversationsPage.lastMessage}: {conversation.last_message || t.conversationsPage.noMessages}
                  </p>
                    {conversation.sentiment ? (
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${sentimentClass(conversation.sentiment)}`}>
                        {conversation.sentiment.toUpperCase()}
                      </span>
                    ) : null}
                  {conversation.unread_count > 0 ? (
                    <span className="mt-2 inline-flex rounded-full bg-cyan-300/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
                      {conversation.unread_count} {t.conversationsPage.unreadSuffix}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <div data-reveal className="scroll-reveal card-premium flex min-h-[68vh] flex-col rounded-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              {activeConversation?.customer_handle || activeConversation?.customer_name || t.conversationsPage.noChatSelected}
            </p>
            <div className="flex items-center gap-2">
              {activeConversation?.taken_over ? (
                <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
                  {t.conversationsPage.humanSupportActive}
                </span>
              ) : (
                <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                  {t.conversationsPage.aiSupportActive}
                </span>
              )}
              <button
                type="button"
                onClick={() => onToggleTakeover(!activeConversation?.taken_over)}
                disabled={!activeConversationId}
                className="button-pop rounded-lg border border-amber-300/35 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/20 disabled:opacity-40"
              >
                {activeConversation?.taken_over ? t.conversationsPage.returnControlToAi : t.conversationsPage.takeOverConversation}
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message) => {
              const isCustomer = message.sender_type === "customer";
              const isAI = message.sender_type === "ai";
              return (
                <div key={message.id} className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm ${
                      isCustomer
                        ? "rounded-br-md bg-white/12 text-slate-100"
                        : isAI
                          ? "rounded-bl-md border border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                          : "rounded-bl-md border border-amber-300/35 bg-amber-300/10 text-amber-100"
                    }`}
                  >
                    <p>{message.content}</p>
                    {isAI && message.confidence !== null ? (
                      <p className="mt-2 text-[11px] text-slate-300">{t.conversationsPage.aiConfidence}: {Math.round(message.confidence * 100)}%</p>
                    ) : null}
                    {message.sentiment ? (
                      <p className="mt-1 text-[11px] text-slate-300">
                        {t.conversationsPage.sentiment}: <span className="font-semibold">{message.sentiment}</span>
                      </p>
                    ) : null}
                    {isAI && message.low_confidence ? (
                      <p className="mt-1 text-[11px] text-amber-200">{t.conversationsPage.considerHumanReview}</p>
                    ) : null}
                    {isAI ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void onFeedback(message, "correct")}
                          className="rounded-md border border-emerald-300/35 bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-300/20"
                        >
                          {t.conversationsPage.correctAnswer}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onFeedback(message, "needs_improvement")}
                          className="rounded-md border border-amber-300/35 bg-amber-300/10 px-2 py-1 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-300/20"
                        >
                          {t.conversationsPage.needsImprovement}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTrainingTarget(message);
                            setCorrectionText("");
                          }}
                          className="rounded-md border border-cyan-300/35 bg-cyan-300/10 px-2 py-1 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                        >
                          {t.conversationsPage.incorrectAnswer}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/10 p-3">
            <form onSubmit={onSendHumanReply} className="mb-2 flex items-center gap-2">
              <input
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder={t.conversationsPage.sendManualReplyPlaceholder}
                className="h-10 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-300/60 focus:outline-none"
              />
              <button
                type="submit"
                className="button-glow button-pop h-10 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                {t.conversationsPage.send}
              </button>
            </form>

            {trainingTarget ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">{t.conversationsPage.aiTrainingMode}</p>
                <label className="mt-2 block">
                  <p className="mb-1 text-xs text-slate-300">{t.conversationsPage.incorrectAiResponse}</p>
                  <textarea
                    value={trainingTarget.content}
                    readOnly
                    rows={2}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200"
                  />
                </label>
                <label className="mt-2 block">
                  <p className="mb-1 text-xs text-slate-300">{t.conversationsPage.correctResponse}</p>
                  <textarea
                    value={correctionText}
                    onChange={(event) => setCorrectionText(event.target.value)}
                    rows={2}
                    placeholder={t.conversationsPage.typeIdealAiAnswer}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:border-cyan-300/60 focus:outline-none"
                  />
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await onSaveCorrection();
                      if (trainingTarget) {
                        await onFeedback(trainingTarget, "incorrect");
                      }
                    }}
                    className="button-pop rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                  >
                    {t.conversationsPage.saveImprovement}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTrainingTarget(null);
                      setCorrectionText("");
                    }}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    {t.conversationsPage.cancel}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  {t.conversationsPage.savedCorrectionsNote}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function sentimentClass(sentiment: string): string {
  if (sentiment === "negative") {
    return "bg-rose-400/15 text-rose-100";
  }
  if (sentiment === "positive") {
    return "bg-emerald-400/15 text-emerald-100";
  }
  return "bg-slate-300/15 text-slate-200";
}

function MetricBadge({
  label,
  value,
  risk,
}: {
  label: string;
  value: string;
  risk?: "High" | "Medium" | "Low";
}) {
  const tone =
    risk === "High"
      ? "border-rose-300/35 bg-rose-400/10 text-rose-100"
      : risk === "Medium"
        ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
        : "border-cyan-300/35 bg-cyan-300/10 text-cyan-100";

  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <p className="text-[11px] uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
