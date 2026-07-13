import React, { forwardRef, useCallback } from "react";
import { Icon } from "@/app/components/Icon";

interface ChatInputProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  isStreaming: boolean;
  isListening: boolean;
  onVoiceToggle: () => void;
  onSubmit: (text: string) => void;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ inputValue, setInputValue, isStreaming, isListening, onVoiceToggle, onSubmit }, ref) => {
    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(inputValue);
    };

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit(inputValue);
        }
      },
      [inputValue, onSubmit]
    );

    return (
      <div
        style={{
          padding: "var(--space-4) var(--space-6) var(--space-6)",
          borderTop: "1px solid var(--surface-glass-border)",
          background: "var(--surface-bg)",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
        }}
      >
        <form onSubmit={handleFormSubmit} role="search" aria-label="Send a message to AI assistant">
          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              alignItems: "flex-end",
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={onVoiceToggle}
              className="btn btn-icon"
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              aria-pressed={isListening}
              style={{
                borderColor: isListening ? "var(--color-brand-danger)" : undefined,
                color: isListening ? "var(--color-brand-danger)" : undefined,
                animation: isListening ? "pulse 1s infinite" : undefined,
                flexShrink: 0,
                minHeight: "var(--touch-target-min)",
                minWidth: "var(--touch-target-min)",
              }}
            >
              {isListening ? <Icon name="stop" size={22} /> : <Icon name="mic" size={22} />}
            </button>

            {/* Text Input */}
            <div style={{ flex: 1, position: "relative" }}>
              <label htmlFor="chat-input" className="sr-only">
                Type a message (press Enter to send, Shift+Enter for newline)
              </label>
              <textarea
                id="chat-input"
                ref={ref}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening
                    ? "Listening... speak now"
                    : "Ask about navigation, food, transport, accessibility..."
                }
                aria-multiline="true"
                aria-label="Chat message input"
                aria-describedby="chat-input-hint"
                rows={1}
                disabled={isStreaming}
                style={{
                  width: "100%",
                  minHeight: "var(--touch-target-min)",
                  maxHeight: "120px",
                  padding: "var(--space-3) var(--space-4)",
                  fontSize: "var(--text-base)",
                  fontFamily: "var(--font-sans)",
                  color: "var(--text-primary)",
                  background: "var(--surface-glass)",
                  border: "1px solid var(--surface-glass-border)",
                  borderRadius: "var(--radius-lg)",
                  resize: "none",
                  outline: "none",
                  transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
                  lineHeight: "var(--leading-normal)",
                  overflow: "hidden",
                  overflowY: "auto",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-brand-primary)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px hsla(220, 90%, 56%, 0.2)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "";
                  e.currentTarget.style.boxShadow = "";
                }}
              />
              <p id="chat-input-hint" className="sr-only">
                Press Enter to send. Press Shift+Enter for a new line.
              </p>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isStreaming}
              className="btn btn-primary"
              aria-label="Send message"
              style={{ flexShrink: 0, gap: "var(--space-2)", minHeight: "var(--touch-target-min)" }}
            >
              {isStreaming ? (
                <span aria-label="Sending...">⟳</span>
              ) : (
                <>
                  Send <Icon name="send" size={18} />
                </>
              )}
            </button>
          </div>
        </form>
        <p
          style={{
            textAlign: "center",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            marginTop: "var(--space-2)",
          }}
        >
          AI responses may not be 100% accurate. For emergencies, contact stadium security directly.
        </p>
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
