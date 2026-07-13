import { renderHook, act } from "@testing-library/react";
import { useSpeechSynthesis } from "@/lib/hooks/useSpeechSynthesis";
import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";
import { useChat } from "@/lib/hooks/useChat";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── useSpeechSynthesis Tests ────────────────────────────────────────────────
describe("useSpeechSynthesis", () => {
  const mockSpeak = vi.fn();
  const mockCancel = vi.fn();

  beforeEach(() => {
    mockSpeak.mockReset();
    mockCancel.mockReset();

    if (typeof window !== "undefined") {
      // Define SpeechSynthesisUtterance globally in JSDOM environment
      (window as any).SpeechSynthesisUtterance = class MockSpeechSynthesisUtterance {
        lang = "";
        rate = 1;
        constructor(public text: string) {}
      };

      if (window.speechSynthesis) {
        vi.spyOn(window.speechSynthesis, "speak").mockImplementation(mockSpeak);
        vi.spyOn(window.speechSynthesis, "cancel").mockImplementation(mockCancel);
      }
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should do nothing if window.speechSynthesis is not defined", () => {
    const originalSpeechSynthesis = window.speechSynthesis;
    try {
      Object.defineProperty(window, "speechSynthesis", {
        value: undefined,
        configurable: true,
      });
    } catch {
      return;
    }

    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak("Hello", "en");
      result.current.stop();
    });
    expect(mockSpeak).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();

    // Restore
    Object.defineProperty(window, "speechSynthesis", {
      value: originalSpeechSynthesis,
      configurable: true,
    });
  });

  it("should return early when window is undefined", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    const originalWindow = global.window;
    try {
      (global as any).window = undefined;
      result.current.speak("Hello", "en");
      result.current.stop();
      expect(mockSpeak).not.toHaveBeenCalled();
    } finally {
      (global as any).window = originalWindow;
    }
  });

  it("should speak text using browser synthesis", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak("Hello world", "en");
    });
    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();
  });

  it("should stop ongoing speech", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.stop();
    });
    expect(mockCancel).toHaveBeenCalled();
  });
});

// ─── useSpeechRecognition Tests ──────────────────────────────────────────────
class MockSpeechRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: any = null;
  onerror: any = null;
  onend: any = null;
  start = vi.fn();
  stop = vi.fn();
}

describe("useSpeechRecognition", () => {
  let originalSpeechRecognition: any;
  let originalWebkitSpeechRecognition: any;

  beforeEach(() => {
    // Inject screen reader announcer elements into document body
    const gDiv = document.createElement("div");
    gDiv.id = "global-announcer";
    const eDiv = document.createElement("div");
    eDiv.id = "emergency-announcer";
    document.body.appendChild(gDiv);
    document.body.appendChild(eDiv);

    if (typeof window !== "undefined") {
      originalSpeechRecognition = (window as any).SpeechRecognition;
      originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition;
      (window as any).SpeechRecognition = undefined;
      (window as any).webkitSpeechRecognition = undefined;
    }
  });

  afterEach(() => {
    const gDiv = document.getElementById("global-announcer");
    const eDiv = document.getElementById("emergency-announcer");
    gDiv?.remove();
    eDiv?.remove();

    if (typeof window !== "undefined") {
      (window as any).SpeechRecognition = originalSpeechRecognition;
      (window as any).webkitSpeechRecognition = originalWebkitSpeechRecognition;
    }
    vi.restoreAllMocks();
  });

  it("should call onError if SpeechRecognition is not supported", () => {
    const { result } = renderHook(() => useSpeechRecognition("en"));
    const mockOnError = vi.fn();

    act(() => {
      result.current.startListening(vi.fn(), mockOnError);
    });

    expect(mockOnError).toHaveBeenCalledWith(
      "Voice input not supported in this browser. Please use Chrome or Edge."
    );
  });

  it("should initialize SpeechRecognition and trigger callbacks on result, error, and end", () => {
    const mockRecInstance = new MockSpeechRecognition();
    if (typeof window !== "undefined") {
      (window as any).SpeechRecognition = vi.fn().mockImplementation(() => mockRecInstance);
    }

    const { result } = renderHook(() => useSpeechRecognition("en"));
    const mockOnResult = vi.fn();
    const mockOnError = vi.fn();

    act(() => {
      result.current.startListening(mockOnResult, mockOnError);
    });

    expect(result.current.isListening).toBe(true);
    expect(mockRecInstance.start).toHaveBeenCalled();

    // Mock onresult
    act(() => {
      mockRecInstance.onresult({
        results: [[{ transcript: "hello world" }]],
      } as any);
    });
    expect(mockOnResult).toHaveBeenCalledWith("hello world");
    expect(result.current.isListening).toBe(false);

    // Mock onerror
    act(() => {
      mockRecInstance.onerror({ error: "no-speech" } as any);
    });
    expect(mockOnError).toHaveBeenCalledWith("no-speech");
    expect(result.current.isListening).toBe(false);

    // Mock onend
    act(() => {
      mockRecInstance.onend();
    });
    expect(result.current.isListening).toBe(false);
  });

  it("should stop listening when stopListening is triggered", () => {
    const mockRecInstance = new MockSpeechRecognition();
    if (typeof window !== "undefined") {
      (window as any).webkitSpeechRecognition = vi.fn().mockImplementation(() => mockRecInstance);
    }

    const { result } = renderHook(() => useSpeechRecognition("fr"));
    act(() => {
      result.current.startListening(vi.fn());
    });
    act(() => {
      result.current.stopListening();
    });
    expect(mockRecInstance.stop).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it("should handle speech recognition result with missing transcript or empty results", () => {
    const mockRecInstance = new MockSpeechRecognition();
    if (typeof window !== "undefined") {
      (window as any).SpeechRecognition = vi.fn().mockImplementation(() => mockRecInstance);
    }
    const { result } = renderHook(() => useSpeechRecognition("en"));
    const mockOnResult = vi.fn();
    act(() => {
      result.current.startListening(mockOnResult);
    });

    act(() => {
      mockRecInstance.onresult({
        results: [],
      } as any);
    });
    expect(mockOnResult).toHaveBeenCalledWith("");
  });

  it("should return early in announce when document is undefined or element is missing", () => {
    const mockRecInstance = new MockSpeechRecognition();
    if (typeof window !== "undefined") {
      (window as any).SpeechRecognition = vi.fn().mockImplementation(() => mockRecInstance);
    }

    const gDiv = document.getElementById("global-announcer");
    const eDiv = document.getElementById("emergency-announcer");
    gDiv?.remove();
    eDiv?.remove();

    const { result } = renderHook(() => useSpeechRecognition("en"));
    act(() => {
      result.current.startListening(vi.fn());
    });

    const newG = document.createElement("div");
    newG.id = "global-announcer";
    const newE = document.createElement("div");
    newE.id = "emergency-announcer";
    document.body.appendChild(newG);
    document.body.appendChild(newE);
  });

  it("should fail gracefully if window is undefined inside startListening", () => {
    const { result } = renderHook(() => useSpeechRecognition("en"));
    const mockOnError = vi.fn();
    const originalWindow = global.window;
    try {
      (global as any).window = undefined;
      act(() => {
        result.current.startListening(vi.fn(), mockOnError);
      });
      expect(mockOnError).toHaveBeenCalledWith("Voice input not supported in this browser. Please use Chrome or Edge.");
    } finally {
      (global as any).window = originalWindow;
    }
  });

  it("should return early in announce when document is undefined in useSpeechRecognition", () => {
    const mockRecInstance = new MockSpeechRecognition();
    if (typeof window !== "undefined") {
      (window as any).SpeechRecognition = vi.fn().mockImplementation(() => mockRecInstance);
    }

    const { result } = renderHook(() => useSpeechRecognition("en"));
    const originalDocument = global.document;
    try {
      (global as any).document = undefined;
      act(() => {
        result.current.startListening(vi.fn());
      });
    } finally {
      (global as any).document = originalDocument;
    }
  });
});

// ─── useChat Tests ───────────────────────────────────────────────────────────
describe("useChat", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should clear conversation properly", () => {
    const { result } = renderHook(() => useChat("metlife"));
    act(() => {
      result.current.setInputValue("Hello");
      result.current.setError("some error");
    });
    act(() => {
      result.current.clearConversation();
    });
    expect(result.current.messages).toEqual([]);
    expect(result.current.inputValue).toBe("");
    expect(result.current.error).toBeNull();
  });

  it("should successfully send message and stream responses", async () => {
    // Setup Mock ReadableStream
    const mockEncoder = new TextEncoder();
    const mockStreamChunks = [
      'data: {"type":"delta","content":"Hello","messageId":"123"}\n',
      'data: {"type":"done","confidence":"high","sources":["source-1"]}\n',
    ];

    let chunkIndex = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        if (chunkIndex < mockStreamChunks.length) {
          const value = mockEncoder.encode(mockStreamChunks[chunkIndex]);
          chunkIndex++;
          return { done: false, value };
        }
        return { done: true, value: undefined };
      }),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const { result } = renderHook(() => useChat("metlife"));
    const mockSpeaker = vi.fn();
    act(() => {
      result.current.setVoiceSpeaker(mockSpeaker);
      result.current.setVoiceEnabled(true);
    });

    await act(async () => {
      await result.current.sendMessage("Hey AI");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.messages.length).toBe(2); // user + assistant message
    expect(result.current.messages[1]?.content).toBe("Hello");
    expect(result.current.messages[1]?.confidence).toBe("high");
    expect(result.current.messages[1]?.sources).toEqual(["source-1"]);
    expect(mockSpeaker).toHaveBeenCalledWith("Hello", "en");
  });

  it("should send history pairs properly", async () => {
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        }),
      },
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const { result } = renderHook(() => useChat("metlife"));
    act(() => {
      result.current.setMessages([
        { id: "1", role: "user", content: "hi", timestamp: new Date(), language: "en" },
        { id: "2", role: "assistant", content: "hello", timestamp: new Date(), language: "en" },
      ]);
    });

    await act(async () => {
      await result.current.sendMessage("how are you?");
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"history":[{"role":"user","parts":["hi"]},{"role":"model","parts":["hello"]}]'),
      })
    );
  });

  it("should ignore malformed JSON chunks in stream", async () => {
    const mockEncoder = new TextEncoder();
    const mockStreamChunks = [
      'data: invalid-json-chunk-here\n',
      'data: {"type":"delta","content":"Ok","messageId":"1"}\n',
    ];

    let chunkIndex = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        if (chunkIndex < mockStreamChunks.length) {
          const value = mockEncoder.encode(mockStreamChunks[chunkIndex]);
          chunkIndex++;
          return { done: false, value };
        }
        return { done: true, value: undefined };
      }),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const { result } = renderHook(() => useChat("metlife"));

    await act(async () => {
      await result.current.sendMessage("Hey");
    });

    expect(result.current.messages[1]?.content).toBe("Ok");
  });

  it("should handle request failure correctly", async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({ reason: "Rate limit exceeded" }),
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const { result } = renderHook(() => useChat("metlife"));

    await act(async () => {
      await result.current.sendMessage("Hey AI");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe("Rate limit exceeded");
  });

  it("should handle fetch throwing an exception", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useChat("metlife"));

    await act(async () => {
      await result.current.sendMessage("Hey AI");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe("Network failure");
  });

  it("should throw error if response has delta type error", async () => {
    const mockEncoder = new TextEncoder();
    const mockStreamChunks = [
      'data: {"type":"error","error":"Internal GenAI failure"}\n',
    ];

    let chunkIndex = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        if (chunkIndex < mockStreamChunks.length) {
          const value = mockEncoder.encode(mockStreamChunks[chunkIndex]);
          chunkIndex++;
          return { done: false, value };
        }
        return { done: true, value: undefined };
      }),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const { result } = renderHook(() => useChat("metlife"));

    await act(async () => {
      await result.current.sendMessage("Hey AI");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe("Internal GenAI failure");
  });

  it("should generate a fallback UUID if crypto.randomUUID is not available", () => {
    const originalCrypto = Object.getOwnPropertyDescriptor(global, "crypto");
    try {
      Object.defineProperty(global, "crypto", {
        value: undefined,
        configurable: true,
        writable: true,
      });
      const { result } = renderHook(() => useChat("metlife"));
      expect(result.current.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    } finally {
      if (originalCrypto) {
        Object.defineProperty(global, "crypto", originalCrypto);
      }
    }
  });

  it("should return early in announce when document is undefined", async () => {
    const originalDocument = global.document;
    try {
      const mockResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);
      
      const { result } = renderHook(() => useChat("metlife"));
      (global as any).document = undefined;
      await act(async () => {
        await result.current.sendMessage("Hey AI");
      });
    } finally {
      (global as any).document = originalDocument;
    }
  });

  it("should announce with setTimeout if element is present", async () => {
    const gDiv = document.createElement("div");
    gDiv.id = "global-announcer";
    const eDiv = document.createElement("div");
    eDiv.id = "emergency-announcer";
    document.body.appendChild(gDiv);
    document.body.appendChild(eDiv);

    try {
      // Mock fetch to return a pending promise so the first announce is not immediately overwritten by the response announce
      vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useChat("metlife"));
      act(() => {
        void result.current.sendMessage("Hey AI");
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(gDiv.textContent).toBe("Sending message to AI assistant");
    } finally {
      gDiv.remove();
      eDiv.remove();
    }
  });

  it("covers setVoiceSpeaker and missing chunk edge cases in streaming", async () => {
    // 1. setVoiceSpeaker check
    const { result: chatHook } = renderHook(() => useChat("metlife"));
    const dummySpeaker = vi.fn();
    act(() => {
      chatHook.current.setVoiceSpeaker(dummySpeaker);
    });

    // 2. Mock reader that returns null chunk, error chunk without error message, and throws a raw string instead of Error
    const mockEncoder = new TextEncoder();
    const mockStreamChunks = [
      'data: null\n', // chunk is null
      'data: {"type":"error"}\n', // chunk error without message
    ];

    let chunkIndex = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        if (chunkIndex < mockStreamChunks.length) {
          const value = mockEncoder.encode(mockStreamChunks[chunkIndex]);
          chunkIndex++;
          return { done: false, value };
        }
        // Throw a non-Error string exception to test instanceof Error fallback in useChat
        throw "Raw string connection failure";
      }),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    await act(async () => {
      await chatHook.current.sendMessage("Hello AI");
    });

    expect(chatHook.current.isStreaming).toBe(false);
    expect(chatHook.current.error).toBe("AI response error");
  });

  it("covers fetch exception with raw string instead of Error", async () => {
    vi.mocked(fetch).mockRejectedValue("Raw string connection failure" as any);

    const { result } = renderHook(() => useChat("metlife"));
    await act(async () => {
      await result.current.sendMessage("Hey AI");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe("Unknown error");
  });

  it("covers fetch response with null body", async () => {
    const mockResponse = {
      ok: true,
      body: null,
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const { result } = renderHook(() => useChat("metlife"));
    await act(async () => {
      await result.current.sendMessage("Hey AI");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe("No response body");
  });

  it("covers stream with empty data line and long ellipsis announcement", async () => {
    const mockEncoder = new TextEncoder();
    const mockStreamChunks = [
      'data: \n', // empty jsonStr
      'data: {"type":"delta","content":"This is a very long response text designed to exceed one hundred characters in length to cover the ellipsis toggle branch in our announcer function. Let us write a few more words here to be absolutely certain it passes."}\n',
      'data: {"type":"done"}\n',
    ];

    let chunkIndex = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        if (chunkIndex < mockStreamChunks.length) {
          const value = mockEncoder.encode(mockStreamChunks[chunkIndex]);
          chunkIndex++;
          return { done: false, value };
        }
        return { done: true, value: undefined };
      }),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const { result } = renderHook(() => useChat("metlife"));
    await act(async () => {
      await result.current.sendMessage("Hey AI");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("covers fallback UUID if crypto is defined but randomUUID is not a function", () => {
    const originalCrypto = Object.getOwnPropertyDescriptor(global, "crypto");
    try {
      Object.defineProperty(global, "crypto", {
        value: { randomUUID: undefined },
        configurable: true,
        writable: true,
      });
      const { result } = renderHook(() => useChat("metlife"));
      expect(result.current.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    } finally {
      if (originalCrypto) {
        Object.defineProperty(global, "crypto", originalCrypto);
      }
    }
  });

  it("should ignore sendMessage call when isStreaming is true", async () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useChat("metlife"));
    act(() => {
      void result.current.sendMessage("Message 1");
    });

    expect(result.current.isStreaming).toBe(true);

    vi.clearAllMocks();
    await act(async () => {
      await result.current.sendMessage("Message 2");
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("covers fetch failure response without error properties falling back to Request failed", async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({}),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const { result } = renderHook(() => useChat("metlife"));
    await act(async () => {
      await result.current.sendMessage("Hey AI");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe("Request failed");
  });
});
