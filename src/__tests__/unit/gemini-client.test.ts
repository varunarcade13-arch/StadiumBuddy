// ─── Gemini AI Client Unit Tests ───────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getGeminiModel, resetGeminiModel } from "@/lib/gemini/client";

// Save original environment
const originalEnv = process.env;

describe("Gemini Client", () => {
  beforeEach(() => {
    resetGeminiModel();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Mock Gemini Model Fallback", () => {
    it("returns Mock Gemini Model when no API key is provided", async () => {
      // Ensure no api key is set
      delete process.env["GEMINI_API_KEY"];

      const model = getGeminiModel();
      expect(model).toBeDefined();
      expect(model.startChat).toBeDefined();

      const chat = model.startChat();
      expect(chat.sendMessageStream).toBeDefined();
    });

    it("mocks streaming response for default case", async () => {
      delete process.env["GEMINI_API_KEY"];
      const model = getGeminiModel();
      const chat = model.startChat();
      const result = await chat.sendMessageStream("hello");
      
      expect(result.stream).toBeDefined();
      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.text();
      }
      expect(text).toContain("Welcome to StadiumBuddy!");
    });

    it("mocks streaming response for seating directions", async () => {
      delete process.env["GEMINI_API_KEY"];
      const model = getGeminiModel();
      const chat = model.startChat();
      const result = await chat.sendMessageStream("Where is Section 115?");
      
      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.text();
      }
      expect(text).toContain("Seating Directions");
      expect(text).toContain("Section 115");
    });

    it("mocks streaming response for restroom/accessibility query", async () => {
      delete process.env["GEMINI_API_KEY"];
      const model = getGeminiModel();
      const chat = model.startChat();
      const result = await chat.sendMessageStream("Need accessible restroom");
      
      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.text();
      }
      expect(text).toContain("Accessibility & Restrooms");
      expect(text).toContain("Section 112");
    });

    it("mocks streaming response for exit/crowd query", async () => {
      delete process.env["GEMINI_API_KEY"];
      const model = getGeminiModel();
      const chat = model.startChat();
      const result = await chat.sendMessageStream("Is there a crowd at exit?");
      
      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.text();
      }
      expect(text).toContain("Exit & Crowd Congestion");
      expect(text).toContain("Gate A");
    });

    it("mocks streaming response for transport query", async () => {
      delete process.env["GEMINI_API_KEY"];
      const model = getGeminiModel();
      const chat = model.startChat();
      const result = await chat.sendMessageStream("transit options to city");
      
      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.text();
      }
      expect(text).toContain("Post-Match Transportation");
    });

    it("mocks streaming response for medical emergency", async () => {
      delete process.env["GEMINI_API_KEY"];
      const model = getGeminiModel();
      const chat = model.startChat();
      const result = await chat.sendMessageStream("medical emergency!");
      
      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.text();
      }
      expect(text).toContain("Potential Emergency");
    });

    it("mocks streaming response for food/vegan options", async () => {
      delete process.env["GEMINI_API_KEY"];
      const model = getGeminiModel();
      const chat = model.startChat();
      const result = await chat.sendMessageStream("vegan food");
      
      let text = "";
      for await (const chunk of result.stream) {
        text += chunk.text();
      }
      expect(text).toContain("Vegan & Food Options");
    });
  });

  describe("Real Gemini Initialization", () => {
    it("initializes real GoogleGenerativeAI when key is provided in config", () => {
      const model = getGeminiModel({ apiKey: "test-api-key" });
      expect(model).toBeDefined();

      // Singleton check
      const model2 = getGeminiModel();
      expect(model2).toBe(model);
    });

    it("initializes real GoogleGenerativeAI when key is in process.env", () => {
      process.env["GEMINI_API_KEY"] = "env-api-key";
      const model = getGeminiModel();
      expect(model).toBeDefined();
    });
  });
});
