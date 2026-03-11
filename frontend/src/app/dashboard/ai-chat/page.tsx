"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getApiHeaders, getBackendBaseUrl } from "../../../lib/backend";

type ChatRole = "user" | "ai";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
};

type Conversation = {
  id: string;
  name: string;
  lastMessage: string;
  updatedAt: string;
};

type ChatApiResponse = {
  reply?: string;
  conversation_id?: string;
};

type ConversationListResponse = {
  conversations?: Array<{
    id: string;
    title: string;
    last_message: string;
    updated_at: string;
  }>;
};

type MessageListResponse = {
  messages?: Array<{
    id: number;
    role: ChatRole;
    content: string;
    created_at: string;
  }>;
  has_more?: boolean;
};

const SESSION_KEY = "worklab_session_token";

function buildTimeLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatServerTimestamp(value: string): string {
  const parsed = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatUpdatedAt(value: string): string {
  const parsed = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.max(1, Math.round(diffMs / 60000));
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return parsed.toLocaleDateString();
}

export default function AiChatPage() {
  const [query, setQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messagesByConversation, setMessagesByConversation] =
    useState<Record<string, ChatMessage[]>>({});
  const [hasMoreByConversation, setHasMoreByConversation] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const backendBaseUrl = getBackendBaseUrl();

  const loadConversations = async (preferConversationId?: string) => {
    const token = window.localStorage.getItem(SESSION_KEY);
    if (!token || !backendBaseUrl) {
      setConversations([]);
      setActiveConversationId(null);
      return;
    }

    const response = await fetch(`${backendBaseUrl}/ai/conversations`, {
      headers: getApiHeaders({
        Authorization: `Bearer ${token}`,
      }),
    });

    if (!response.ok) {
      if (response.status === 402 || response.status === 403) {
        throw new Error("subscription-required");
      }
      throw new Error("Failed to load conversations");
    }

    const data = (await response.json()) as ConversationListResponse;
    const mappedConversations: Conversation[] = (data.conversations || []).map((conversation) => ({
      id: conversation.id,
      name: conversation.title,
      lastMessage: conversation.last_message || "No messages yet",
      updatedAt: formatUpdatedAt(conversation.updated_at),
    }));

    setConversations(mappedConversations);

    if (mappedConversations.length === 0) {
      setActiveConversationId(null);
      return;
    }

    if (preferConversationId && mappedConversations.some((item) => item.id === preferConversationId)) {
      setActiveConversationId(preferConversationId);
      return;
    }

    setActiveConversationId((previous) => {
      if (previous && mappedConversations.some((item) => item.id === previous)) {
        return previous;
      }
      return mappedConversations[0].id;
    });
  };

  const loadMessages = async (conversationId: string, beforeId?: number) => {
    const token = window.localStorage.getItem(SESSION_KEY);
    if (!token || !backendBaseUrl) {
      return;
    }

    const params = new URLSearchParams();
    params.set("limit", "24");
    if (beforeId) {
      params.set("before_id", String(beforeId));
    }

    const response = await fetch(
      `${backendBaseUrl}/ai/conversations/${conversationId}/messages?${params.toString()}`,
      {
        headers: getApiHeaders({
          Authorization: `Bearer ${token}`,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 402 || response.status === 403) {
        throw new Error("subscription-required");
      }
      throw new Error("Failed to load messages");
    }

    const data = (await response.json()) as MessageListResponse;
    const mappedMessages: ChatMessage[] = (data.messages || []).map((message) => ({
      id: String(message.id),
      role: message.role,
      content: message.content,
      timestamp: formatServerTimestamp(message.created_at),
    }));

    setMessagesByConversation((previous) => ({
      ...previous,
      [conversationId]: beforeId
        ? [...mappedMessages, ...(previous[conversationId] || [])]
        : mappedMessages,
    }));
    setHasMoreByConversation((previous) => ({
      ...previous,
      [conversationId]: Boolean(data.has_more),
    }));
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!backendBaseUrl) {
        setErrorText("Backend URL is not configured.");
        setIsLoading(false);
        return;
      }

      try {
        await loadConversations();
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error && error.message === "subscription-required" ? "Subscription required for AI Chat." : "Unable to load conversations.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [backendBaseUrl]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    void loadMessages(activeConversationId).catch((error) => {
      setErrorText(error instanceof Error && error.message === "subscription-required" ? "Subscription required for AI Chat." : "Unable to load conversation messages.");
    });
  }, [activeConversationId]);

  const visibleConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      return (
        conversation.name.toLowerCase().includes(normalized) ||
        conversation.lastMessage.toLowerCase().includes(normalized)
      );
    });
  }, [query, conversations]);

  const activeMessages = activeConversationId ? messagesByConversation[activeConversationId] || [] : [];
  const hasMoreActiveMessages = activeConversationId
    ? Boolean(hasMoreByConversation[activeConversationId])
    : false;

  const onLoadOlderMessages = async () => {
    if (!activeConversationId || activeMessages.length === 0) {
      return;
    }

    const oldestMessageId = Number(activeMessages[0].id);
    if (!Number.isFinite(oldestMessageId)) {
      return;
    }

    setIsLoadingOlder(true);
    try {
      await loadMessages(activeConversationId, oldestMessageId);
    } catch (error) {
      setErrorText(error instanceof Error && error.message === "subscription-required" ? "Subscription required for AI Chat." : "Unable to load older messages.");
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const onRenameConversation = async () => {
    if (!activeConversationId) {
      return;
    }

    const currentTitle = conversations.find((item) => item.id === activeConversationId)?.name || "";
    const nextTitle = window.prompt("Rename conversation", currentTitle)?.trim();
    if (!nextTitle || !backendBaseUrl) {
      return;
    }

    const token = window.localStorage.getItem(SESSION_KEY);
    if (!token) {
      setErrorText("Session is missing.");
      return;
    }

    try {
      const response = await fetch(`${backendBaseUrl}/ai/conversations/${activeConversationId}`, {
        method: "PATCH",
        headers: getApiHeaders({
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }),
        body: JSON.stringify({ title: nextTitle }),
      });

      if (!response.ok) {
        throw new Error("Rename failed");
      }

      await loadConversations(activeConversationId);
    } catch {
      setErrorText("Unable to rename this conversation.");
    }
  };

  const onDeleteConversation = async () => {
    if (!activeConversationId || !backendBaseUrl) {
      return;
    }

    const confirmed = window.confirm("Delete this conversation? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    const token = window.localStorage.getItem(SESSION_KEY);
    if (!token) {
      setErrorText("Session is missing.");
      return;
    }

    try {
      const response = await fetch(`${backendBaseUrl}/ai/conversations/${activeConversationId}`, {
        method: "DELETE",
        headers: getApiHeaders({
          Authorization: `Bearer ${token}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setMessagesByConversation((previous) => {
        const next = { ...previous };
        delete next[activeConversationId];
        return next;
      });
      await loadConversations();
    } catch {
      setErrorText("Unable to delete this conversation.");
    }
  };

  const onSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextMessage = messageInput.trim();
    if (!nextMessage) {
      return;
    }

    const token = window.localStorage.getItem(SESSION_KEY);
    if (!backendBaseUrl || !token) {
      setErrorText("Backend URL is not configured.");
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: nextMessage,
      timestamp: buildTimeLabel(),
    };

    setErrorText(null);
    setMessageInput("");
    setIsTyping(true);
    setMessagesByConversation((previous) => {
      const conversationKey = activeConversationId || "pending";
      const prevMessages = previous[conversationKey] || [];
      return {
        ...previous,
        [conversationKey]: [...prevMessages, userMessage],
      };
    });

    try {
      const response = await fetch(`${backendBaseUrl}/ai/chat`, {
        method: "POST",
        headers: getApiHeaders({
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }),
        body: JSON.stringify({
          message: nextMessage,
          conversation_id: activeConversationId || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 402 || response.status === 403) {
          throw new Error("subscription-required");
        }
        throw new Error("Request failed");
      }

      const data = (await response.json()) as ChatApiResponse;
      const aiReply = data.reply || "I received your message.";
      const conversationId = data.conversation_id || activeConversationId;

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: aiReply,
        timestamp: buildTimeLabel(),
      };

      setMessagesByConversation((previous) => {
        const conversationKey = conversationId || "pending";
        const prevMessages = previous[conversationKey] || [];
        const pendingMessages = previous.pending || [];
        const merged = conversationKey === "pending" ? prevMessages : [...pendingMessages, ...prevMessages];
        return {
          ...previous,
          [conversationKey]: [...merged, aiMessage],
          pending: [],
        };
      });

      if (conversationId) {
        await loadConversations(conversationId);
        await loadMessages(conversationId);
      }
    } catch (error) {
      setErrorText(error instanceof Error && error.message === "subscription-required" ? "Subscription required for AI Chat." : "Unable to reach AI service right now. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <section className="animate-fade-in mx-auto max-w-7xl">
      <header className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-300/10 to-purple-500/10 p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Support Workspace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">AI Support Chat</h1>
      </header>

      <div className="grid min-h-[70vh] gap-4 md:grid-cols-[300px,1fr]">
        <aside className="rounded-2xl border border-white/10 bg-[#091022]/80 p-4 backdrop-blur-xl">
          <div className="mb-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200">Customer Chats</p>
            <p className="mt-1 text-xs text-slate-400">Recent interactions</p>
          </div>

          <div className="mb-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conversations"
              className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-300/60 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
            />
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-slate-300">
                Loading conversations...
              </div>
            ) : null}

            {!isLoading && visibleConversations.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-slate-300">
                No conversations yet. Send a message to start your first chat.
              </div>
            ) : null}

            {visibleConversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveConversationId(conversation.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-cyan-300/35 bg-cyan-300/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{conversation.name}</p>
                    <span className="text-xs text-slate-400">{conversation.updatedAt}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-300">{conversation.lastMessage}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex min-h-[68vh] flex-col rounded-2xl border border-white/10 bg-[#0a1022]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
            <p className="truncate text-sm font-semibold text-white">
              {conversations.find((item) => item.id === activeConversationId)?.name || "New chat"}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRenameConversation}
                disabled={!activeConversationId}
                className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={onDeleteConversation}
                disabled={!activeConversationId}
                className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-rose-200 transition hover:border-rose-300/40 hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
            {!activeConversationId && !isLoading ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                Select a conversation or send a message to create a new one.
              </div>
            ) : null}

            {activeConversationId && hasMoreActiveMessages ? (
              <div className="flex justify-center pb-1">
                <button
                  type="button"
                  onClick={onLoadOlderMessages}
                  disabled={isLoadingOlder}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingOlder ? "Loading..." : "Load older messages"}
                </button>
              </div>
            ) : null}

            {activeMessages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.02)] ${
                      isUser
                        ? "rounded-br-md bg-white/12 text-slate-100"
                        : "rounded-bl-md border border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{message.timestamp}</p>
                  </div>
                </div>
              );
            })}

            {isTyping ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-cyan-100">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-200" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-200 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-200 [animation-delay:240ms]" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/10 p-3 sm:p-4">
            {errorText ? (
              <p className="mb-2 text-xs text-rose-300">
                {errorText}
                {errorText.includes("Subscription required") ? (
                  <Link href="/pricing" className="ml-2 text-cyan-200 underline underline-offset-2">
                    Upgrade plan
                  </Link>
                ) : null}
              </p>
            ) : null}
            <form onSubmit={onSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Attachment (coming soon)"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-300 transition hover:border-white/25 hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M12.1 7.5L8.4 11.2C7.2 12.4 7.2 14.4 8.4 15.6C9.6 16.8 11.6 16.8 12.8 15.6L17.2 11.2C19 9.4 19 6.6 17.2 4.8C15.4 3 12.6 3 10.8 4.8L5.7 9.9C2.9 12.7 2.9 17.3 5.7 20.1C8.5 22.9 13.1 22.9 15.9 20.1L20 16"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <input
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder="Type your message..."
                className="h-11 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-slate-400 focus:border-cyan-300/60 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
              />

              <button
                type="submit"
                disabled={isTyping}
                className="h-11 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
