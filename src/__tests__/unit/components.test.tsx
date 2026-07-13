import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Icon } from "@/app/components/Icon";
import { Logo } from "@/app/components/Logo";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { ChatInput } from "@/app/chat/components/ChatInput";
import { PreferencesModal } from "@/app/chat/components/PreferencesModal";
import { MessageList } from "@/app/chat/components/MessageList";
import { ThemeProvider, useTheme } from "@/lib/context/ThemeContext";
import type { ChatMessage } from "@/types/chat.types";

// Helper component for ThemeContext usage
const ThemeConsumer = () => {
  const { theme } = useTheme();
  return <div data-testid="theme-value">{theme}</div>;
};

// Error-throwing component for testing ErrorBoundary
const ErrorThrower = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Simulated rendering error");
  }
  return <div data-testid="child-content">Normal Child Content</div>;
};

describe("Reusable UI Components", () => {
  describe("Icon component", () => {
    it("renders existing icon with default sizes", () => {
      const { container } = render(<Icon name="bot" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.getAttribute("width")).toBe("20");
      expect(svg?.getAttribute("height")).toBe("20");
    });

    it("renders existing icon with custom properties", () => {
      const { container } = render(<Icon name="map" size={32} stroke="red" strokeWidth={3} />);
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("width")).toBe("32");
      expect(svg?.getAttribute("stroke")).toBe("red");
      expect(svg?.getAttribute("stroke-width")).toBe("3");
    });

    it("handles non-existent icon names gracefully by drawing nothing", () => {
      const { container } = render(<Icon name={"nonexistent" as any} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.querySelectorAll("path").length).toBe(0);
    });
  });

  describe("Logo component", () => {
    it("renders logo with text by default", () => {
      render(<Logo />);
      expect(screen.getByLabelText("StadiumBuddy AI home")).toBeInTheDocument();
      expect(screen.getByText("StadiumBuddy")).toBeInTheDocument();
      expect(screen.getByText("AI")).toBeInTheDocument();
    });

    it("supports hiding logo text using props", () => {
      render(<Logo showText={false} />);
      expect(screen.getByLabelText("StadiumBuddy AI home")).toBeInTheDocument();
      expect(screen.queryByText("StadiumBuddy")).not.toBeInTheDocument();
    });
  });

  describe("ThemeToggle component", () => {
    it("renders theme toggle and responds to context theme changes", () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
          <ThemeConsumer />
        </ThemeProvider>
      );

      const button = screen.getByRole("button");
      const themeVal = screen.getByTestId("theme-value");
      expect(themeVal.textContent).toBe("light");

      // Verify hover inline style hooks do not crash
      fireEvent.mouseEnter(button);
      expect(button.style.background).toBe("var(--surface-card-hover)");
      fireEvent.mouseLeave(button);
      expect(button.style.background).toBe("transparent");

      // Clicking toggles theme context state
      fireEvent.click(button);
      expect(themeVal.textContent).toBe("dark");
    });
  });

  describe("ErrorBoundary component", () => {
    const originalLocation = window.location;

    beforeEach(() => {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { reload: vi.fn() },
      });
    });

    afterEach(() => {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    });

    it("renders children normally when no error is present", () => {
      render(
        <ErrorBoundary>
          <ErrorThrower shouldThrow={false} />
        </ErrorBoundary>
      );
      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("renders fallback UI when child throws error, and reloads page on reset click", () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "production";

      render(
        <ErrorBoundary>
          <ErrorThrower shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Simulated rendering error")).toBeInTheDocument();

      const reloadBtn = screen.getByRole("button", { name: "Reload Page" });
      fireEvent.click(reloadBtn);
      expect(window.location.reload).toHaveBeenCalledTimes(1);

      (process.env as any).NODE_ENV = originalEnv;
    });
  });
});

describe("Chat Screen UI Components", () => {
  describe("ChatInput component", () => {
    const defaultProps = {
      inputValue: "",
      setInputValue: vi.fn(),
      isStreaming: false,
      isListening: false,
      onVoiceToggle: vi.fn(),
      onSubmit: vi.fn(),
    };

    it("renders input field and handles typing", () => {
      render(<ChatInput {...defaultProps} inputValue="Hello AI" />);
      const textarea = screen.getByRole("textbox", { name: "Chat message input" });
      expect(textarea).toBeInTheDocument();
      expect(textarea.getAttribute("placeholder")).toContain("Ask about navigation");
      
      fireEvent.change(textarea, { target: { value: "New Message" } });
      expect(defaultProps.setInputValue).toHaveBeenCalledWith("New Message");
    });

    it("submits text on submit button click", () => {
      render(<ChatInput {...defaultProps} inputValue="Send This" />);
      const sendBtn = screen.getByRole("button", { name: "Send message" });
      fireEvent.click(sendBtn);
      expect(defaultProps.onSubmit).toHaveBeenCalledWith("Send This");
    });

    it("submits text on Enter keydown, but adds newline on Shift+Enter", () => {
      render(<ChatInput {...defaultProps} inputValue="Enter Text" />);
      const textarea = screen.getByRole("textbox", { name: "Chat message input" });

      // Enter press
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
      expect(defaultProps.onSubmit).toHaveBeenCalledWith("Enter Text");

      // Shift+Enter press (should bypass submit)
      vi.clearAllMocks();
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it("disables inputs and buttons during streaming state", () => {
      render(<ChatInput {...defaultProps} isStreaming={true} />);
      const textarea = screen.getByRole("textbox", { name: "Chat message input" });
      expect(textarea).toBeDisabled();
      const sendBtn = screen.getByRole("button", { name: "Send message" });
      expect(sendBtn).toBeDisabled();
    });

    it("toggles voice recognition button classes on listening state changes", () => {
      render(<ChatInput {...defaultProps} isListening={true} />);
      const voiceBtn = screen.getByRole("button", { name: "Stop voice input" });
      expect(voiceBtn).toBeInTheDocument();
      expect(voiceBtn.style.animation).toContain("pulse");
      
      fireEvent.click(voiceBtn);
      expect(defaultProps.onVoiceToggle).toHaveBeenCalled();
    });

    it("focuses and blurs inputs properly updates inline shadows", () => {
      render(<ChatInput {...defaultProps} />);
      const textarea = screen.getByRole("textbox", { name: "Chat message input" });
      
      fireEvent.focus(textarea);
      expect(textarea.style.borderColor).toBe("var(--color-brand-primary)");
      
      fireEvent.blur(textarea);
      expect(textarea.style.borderColor).toBe("");
    });
  });

  describe("PreferencesModal component", () => {
    const mockPrefs = {
      mobilityAssistanceNeeded: false,
      preferredTransport: "metro" as const,
      dietaryRestrictions: ["vegan"],
      language: "en" as const,
      seatingZone: "Section 115",
    };

    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      userPrefs: mockPrefs,
      onChange: vi.fn(),
    };

    it("renders nothing when isOpen is false", () => {
      const { container } = render(<PreferencesModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders modal preferences and handles toggling values", () => {
      render(<PreferencesModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Assistant Preferences")).toBeInTheDocument();

      // Mobility checkbox
      const mobilityCheckbox = screen.getByRole("checkbox", { name: "Request mobility or wheelchair assistance" });
      expect(mobilityCheckbox).not.toBeChecked();
      fireEvent.click(mobilityCheckbox);
      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...mockPrefs,
        mobilityAssistanceNeeded: true,
      });

      // Transport select dropdown
      const transportSelect = screen.getByRole("combobox", { name: "Preferred Departure Transport" });
      expect(transportSelect).toHaveValue("metro");
      fireEvent.change(transportSelect, { target: { value: "taxi" } });
      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...mockPrefs,
        preferredTransport: "taxi",
      });

      // Seating zone text input
      const seatingInput = screen.getByRole("textbox", { name: "Your Seating Zone" });
      expect(seatingInput).toHaveValue("Section 115");
      fireEvent.change(seatingInput, { target: { value: "Section 200" } });
      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...mockPrefs,
        seatingZone: "Section 200",
      });
    });

    it("handles toggling dietary restriction checkbox options", () => {
      render(<PreferencesModal {...defaultProps} />);

      // Adding Kosher restriction (currently not in mockPrefs)
      const kosherLabel = screen.getByLabelText("Kosher");
      expect(kosherLabel).not.toBeChecked();
      fireEvent.click(kosherLabel);
      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...mockPrefs,
        dietaryRestrictions: ["vegan", "kosher"],
      });

      // Removing Vegan restriction (currently in mockPrefs)
      const veganLabel = screen.getByLabelText("Vegan");
      expect(veganLabel).toBeChecked();
      fireEvent.click(veganLabel);
      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...mockPrefs,
        dietaryRestrictions: [],
      });
    });

    it("triggers onClose callback when close button is clicked", () => {
      render(<PreferencesModal {...defaultProps} />);
      const closeBtn = screen.getByRole("button", { name: "Close preferences modal" });
      fireEvent.click(closeBtn);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("handles empty/null preference settings and duplicate dietary additions", () => {
      const emptyPrefs = {
        mobilityAssistanceNeeded: false,
        preferredTransport: null,
        dietaryRestrictions: ["vegan"],
        language: "en" as const,
        seatingZone: null,
      };
      const onChangeMock = vi.fn();

      render(
        <PreferencesModal
          isOpen={true}
          onClose={vi.fn()}
          userPrefs={emptyPrefs}
          onChange={onChangeMock}
        />
      );

      const seatingInput = screen.getByRole("textbox", { name: "Your Seating Zone" });
      expect(seatingInput).toHaveValue("");

      const transportSelect = screen.getByRole("combobox", { name: "Preferred Departure Transport" });
      expect(transportSelect).toHaveValue("");

      // Trigger transport change to empty/null value
      fireEvent.change(transportSelect, { target: { value: "" } });
      expect(onChangeMock).toHaveBeenCalledWith({
        ...emptyPrefs,
        preferredTransport: null,
      });

      // Trigger seating change to empty/null value
      fireEvent.change(seatingInput, { target: { value: "" } });
      expect(onChangeMock).toHaveBeenCalledWith({
        ...emptyPrefs,
        seatingZone: null,
      });

      // Add duplicate restriction already in userPrefs.dietaryRestrictions
      const veganCheckbox = screen.getByLabelText("Vegan");
      fireEvent.change(veganCheckbox, { target: { checked: true } });
      expect(onChangeMock).toHaveBeenCalledWith({
        ...emptyPrefs,
        dietaryRestrictions: ["vegan"],
      });
    });
  });

  describe("MessageList component", () => {
    const mockMessages = [
      {
        id: "msg-1",
        role: "user" as const,
        content: "Where do I eat vegan food?",
        timestamp: new Date("2026-07-13T12:00:00Z"),
        language: "en" as const,
      },
      {
        id: "msg-2",
        role: "assistant" as const,
        content: "### Situation\nLooking for food.\n\n• Vegan Options Section 115\n- Salad concession area B\n1. Check gate C\n## Headings test\n**Bold Text** and *Italic text*",
        timestamp: new Date("2026-07-13T12:01:00Z"),
        language: "en" as const,
        confidence: "high" as const,
        sources: ["Menu FAQs"],
      },
    ];

    it("renders messages list and parses Markdown formats correctly", () => {
      render(
        <MessageList
          messages={mockMessages}
          isStreaming={false}
          partialContent=""
        />
      );

      // Verify user message display
      expect(screen.getByText("Where do I eat vegan food?")).toBeInTheDocument();

      // Verify Markdown parsing tags
      expect(screen.getByText("Situation")).toBeInTheDocument(); // Heading formatting
      expect(screen.getByText("Vegan Options Section 115")).toBeInTheDocument(); // Bullet point formats
      expect(screen.getByText("Salad concession area B")).toBeInTheDocument(); // Hyphen list formats
      expect(screen.getByText("Check gate C")).toBeInTheDocument(); // Numbered lists
      expect(screen.getByText("Headings test")).toBeInTheDocument(); // Double hash headings
      
      // Inline formatting check (bold, italics)
      expect(screen.getByText("Bold Text")).toBeInTheDocument();
      expect(screen.getByText("Italic text")).toBeInTheDocument();

      // Verify sources and metadata details
      expect(screen.getByText("Sources: Menu FAQs")).toBeInTheDocument();
      expect(screen.getByLabelText("Confidence: high")).toBeInTheDocument();
    });

    it("renders loading composition dots during streaming start state", () => {
      render(
        <MessageList
          messages={[]}
          isStreaming={true}
          partialContent=""
        />
      );

      expect(screen.getByLabelText("AI is composing a response", { exact: false })).toBeInTheDocument();
    });

    it("renders streaming partial chunk contents during active streams", () => {
      render(
        <MessageList
          messages={[]}
          isStreaming={true}
          partialContent="Thinking... **please wait**"
        />
      );

      expect(screen.getByText("Thinking...")).toBeInTheDocument();
      expect(screen.getByText("please wait")).toBeInTheDocument();
    });

    it("renders medium and uncertain confidence levels correctly", () => {
      const altMessages: ChatMessage[] = [
        {
          id: "msg-a",
          role: "assistant" as const,
          content: "Response A",
          timestamp: new Date(),
          language: "en" as const,
          confidence: "medium" as const,
        },
        {
          id: "msg-b",
          role: "assistant" as const,
          content: "Response B",
          timestamp: new Date(),
          language: "en" as const,
          confidence: "uncertain" as const,
        },
      ];

      const { rerender } = render(
        <MessageList
          messages={[altMessages[0]!]}
          isStreaming={false}
          partialContent=""
        />
      );

      expect(screen.getByLabelText("Confidence: medium")).toBeInTheDocument();

      rerender(
        <MessageList
          messages={[altMessages[1]!]}
          isStreaming={false}
          partialContent=""
        />
      );

      expect(screen.getByLabelText("Confidence: uncertain")).toBeInTheDocument();
    });
  });
});
