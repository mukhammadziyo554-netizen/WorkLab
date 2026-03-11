"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { operationsFetch } from "../../../lib/operations";

type ConversationItem = {
  id: string;
  customer_handle?: string;
  customer_name?: string;
  last_message?: string;
  timestamp?: string;
  unread_count: number;
  taken_over: boolean;
};

type ConversationMessage = {
  id: number;
  sender_type: "customer" | "ai" | "human";
  content: string;
  confidence: number | null;
  created_at: string;
  low_confidence: boolean;
};

type ConversationsResponse = {
  conversations: ConversationItem[];
};

type ConversationDetailResponse = {
  conversation: ConversationItem;
  messages: ConversationMessage[];
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [correctionText, setCorrectionText] = useState("");
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
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadConversations();
      } catch {
        setErrorText("Unable to load conversations.");
      }
    };
    void run();
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    void loadConversationDetail(activeConversationId).catch(() => {
      setErrorText("Unable to load selected conversation.");
    });
  }, [activeConversationId]);

  const onTakeOver = async () => {
    if (!activeConversationId) {
      return;
    }
    setErrorText(null);

    try {
      await operationsFetch(`/operations/conversations/${activeConversationId}/takeover`, {
        method: "POST",
      });
      await loadConversations(activeConversationId);
      await loadConversationDetail(activeConversationId);
    } catch {
      setErrorText("Could not activate takeover mode.");
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
      setErrorText("Unable to send human reply.");
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
      await loadConversations(activeConversationId);
      await loadConversationDetail(activeConversationId);
    } catch {
      setErrorText("Unable to save correction.");
    }
  };

  return (
    <section className="animate-fade-in mx-auto max-w-7xl">
      <header className="mb-5 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-300/10 to-[#121a31] p-5">
        <h1 className="text-3xl font-bold text-white">Conversations</h1>
        <p className="mt-2 text-sm text-slate-300">Live Telegram conversation monitoring for AI employees.</p>
      </header>

      {errorText ? <p className="mb-3 text-sm text-rose-300">{errorText}</p> : null}

      <div className="grid min-h-[70vh] gap-4 md:grid-cols-[320px,1fr]">
        <aside className="rounded-2xl border border-white/10 bg-[#091022]/80 p-4 backdrop-blur-xl">
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveConversationId(conversation.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-cyan-300/35 bg-cyan-300/10"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {conversation.customer_handle || conversation.customer_name || "Customer"}
                    </p>
                    <span className="text-[11px] text-slate-400">{conversation.timestamp || "now"}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-300">
                    Last message: {conversation.last_message || "No messages"}
                  </p>
                  {conversation.unread_count > 0 ? (
                    <span className="mt-2 inline-flex rounded-full bg-cyan-300/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
                      {conversation.unread_count} unread
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex min-h-[68vh] flex-col rounded-2xl border border-white/10 bg-[#0a1022]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              {activeConversation?.customer_handle || activeConversation?.customer_name || "No chat selected"}
            </p>
            <button
              type="button"
              onClick={onTakeOver}
              disabled={!activeConversationId}
              className="rounded-lg border border-amber-300/35 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/20 disabled:opacity-40"
            >
              Take Over Chat
            </button>
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
                      <p className="mt-2 text-[11px] text-slate-300">AI Confidence: {Math.round(message.confidence * 100)}%</p>
                    ) : null}
                    {isAI && message.low_confidence ? (
                      <p className="mt-1 text-[11px] text-amber-200">I am not completely sure about this answer.</p>
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
                placeholder="Send manual reply"
                className="h-10 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-300/60 focus:outline-none"
              />
              <button
                type="submit"
                className="h-10 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Send
              </button>
            </form>

            <div className="flex items-center gap-2">
              <input
                value={correctionText}
                onChange={(event) => setCorrectionText(event.target.value)}
                placeholder="Correct Answer"
                className="h-10 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-300/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={onSaveCorrection}
                className="h-10 rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Correct Answer
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
