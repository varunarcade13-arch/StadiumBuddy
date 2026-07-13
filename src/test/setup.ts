/// <reference types="vitest/globals" />
import "@testing-library/jest-dom";

// Mock Web Speech API
class MockSpeechRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

Object.defineProperty(window, "SpeechRecognition", { writable: true, value: MockSpeechRecognition });
Object.defineProperty(window, "webkitSpeechRecognition", { writable: true, value: MockSpeechRecognition });

// Mock speechSynthesis
Object.defineProperty(window, "speechSynthesis", {
  writable: true,
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
  },
});

// Mock fetch for unit tests (override per-test)
global.fetch = vi.fn();

// Suppress console.error in tests
vi.spyOn(console, "error").mockImplementation(() => {});
