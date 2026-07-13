import React, { memo } from "react";
import type { ChatMessage } from "@/types/chat.types";
import { Icon } from "@/app/components/Icon";

interface MessageListProps {
  messages: readonly ChatMessage[];
  isStreaming: boolean;
  partialContent: string;
}

export function MessageList({ messages, isStreaming, partialContent }: MessageListProps) {
  return (
    <div
      role="log"
      aria-label="Conversation history"
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions"
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* Streaming partial message */}
      {isStreaming && (
        <div
          aria-label="AI is typing"
          style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--gradient-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              flexShrink: 0,
            }}
          >
            <Icon name="stadium" size={20} />
          </div>
          <div className="chat-bubble-assistant">
            {partialContent ? (
              <MarkdownContent content={partialContent} />
            ) : (
              <div className="chat-typing-indicator" aria-label="AI is composing a response">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const MessageBubble = memo(function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-3)",
        alignItems: "flex-start",
        flexDirection: isUser ? "row-reverse" : "row",
      }}
      className="animate-fade-in-up"
    >
      {/* Avatar */}
      <div
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: isUser ? "var(--surface-card)" : "var(--gradient-brand)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isUser ? "var(--text-secondary)" : "white",
          flexShrink: 0,
          border: "1px solid var(--surface-glass-border)",
        }}
      >
        {isUser ? <Icon name="user" size={20} /> : <Icon name="stadium" size={20} />}
      </div>

      <div style={{ maxWidth: "80%" }}>
        <div
          className={isUser ? "chat-bubble-user" : "chat-bubble-assistant"}
          aria-label={`${isUser ? "You" : "StadiumBuddy AI"}: ${message.content}`}
        >
          <MarkdownContent content={message.content} />
        </div>

        {/* Metadata */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginTop: "var(--space-1)",
            justifyContent: isUser ? "flex-end" : "flex-start",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            <time dateTime={message.timestamp.toISOString()}>
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </time>
          </span>
          {message.confidence && !isUser && (
            <span
              className={`badge badge-${message.confidence === "high" ? "low" : message.confidence === "medium" ? "moderate" : "high"}`}
              aria-label={`Confidence: ${message.confidence}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
            >
              {message.confidence === "uncertain" && <Icon name="alertTriangle" size={14} />}
              {message.confidence}
            </span>
          )}
          {message.sources && message.sources.length > 0 && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Sources: {message.sources.join(", ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

const MarkdownContent = memo(function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div style={{ lineHeight: "var(--leading-relaxed)" }}>
      {lines.map((line, i) => {
        if (line.startsWith("• ") || line.startsWith("- ") || line.match(/^\d+\.\s/)) {
          return (
            <div key={i} style={{ paddingLeft: "var(--space-3)", marginBottom: "var(--space-1)" }}>
              <span aria-hidden="true">• </span>
              <InlineFormatted text={line.replace(/^[•\-]\s|\d+\.\s/, "")} />
            </div>
          );
        }
        if (line.startsWith("## ") || line.startsWith("### ")) {
          return (
            <p key={i} style={{ fontWeight: "var(--weight-bold)", marginBottom: "var(--space-2)" }}>
              <InlineFormatted text={line.replace(/^#{2,3}\s/, "")} />
            </p>
          );
        }
        if (line === "") return <div key={i} style={{ height: "var(--space-2)" }} />;
        return (
          <p key={i} style={{ marginBottom: "var(--space-1)" }}>
            <InlineFormatted text={line} />
          </p>
        );
      })}
    </div>
  );
});

const InlineFormatted = memo(function InlineFormatted({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
});
