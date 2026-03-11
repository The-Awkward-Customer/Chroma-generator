import { describe, it, expect, beforeEach } from "vitest";
import {
  VERBS,
  slugify,
  pickCollectionName,
  resetRng,
} from "../lexicon";

describe("lexicon", () => {
  beforeEach(() => {
    resetRng();
  });

  describe("VERBS", () => {
    it("should contain at least 50 verbs", () => {
      expect(VERBS.length).toBeGreaterThanOrEqual(50);
    });

    it("should contain only lowercase strings", () => {
      for (const v of VERBS) {
        expect(v).toBe(v.toLowerCase());
      }
    });
  });

  describe("slugify", () => {
    it("should strip file extension", () => {
      expect(slugify("sunset.png")).toBe("sunse");
    });

    it("should truncate to 5 characters", () => {
      expect(slugify("sunset-photography.jpg")).toBe("sunse");
    });

    it("should lowercase and replace special chars with hyphens", () => {
      expect(slugify("My Photo")).toBe("my-ph");
    });

    it("should handle names shorter than 5 chars", () => {
      expect(slugify("cat.png")).toBe("cat");
    });

    it("should strip leading/trailing hyphens", () => {
      expect(slugify("--hi--.png")).toBe("hi");
    });

    it("should handle names with multiple dots", () => {
      expect(slugify("file.test.png")).toBe("file-");
    });
  });

  describe("pickCollectionName", () => {
    it("should return a name starting with ChromaExtract", () => {
      const name = pickCollectionName("sunset.png", []);
      expect(name).toMatch(/^ChromaExtract /);
    });

    it("should include a capitalized verb", () => {
      const name = pickCollectionName("sunset.png", []);
      // Extract the verb part (between "ChromaExtract " and "-")
      const match = name.match(/^ChromaExtract (\w+)-/);
      expect(match).not.toBeNull();
      const verb = match![1].toLowerCase();
      expect(VERBS).toContain(verb);
    });

    it("should include the truncated slugified source name", () => {
      const name = pickCollectionName("sunset.png", []);
      expect(name).toContain("Sunse");
    });

    it("should produce deterministic results from seed 42", () => {
      const name1 = pickCollectionName("test.png", []);
      resetRng();
      const name2 = pickCollectionName("test.png", []);
      expect(name1).toBe(name2);
    });

    it("should produce different names on successive calls", () => {
      const name1 = pickCollectionName("img.png", []);
      const name2 = pickCollectionName("img.png", []);
      expect(name1).not.toBe(name2);
    });

    it("should skip names that already exist", () => {
      const first = pickCollectionName("a.png", []);
      resetRng();
      const second = pickCollectionName("a.png", [first]);
      expect(second).not.toBe(first);
    });

    it("should fall back to counter when all names collide", () => {
      // Generate enough names to fill all possible verb combos
      const existing: string[] = [];
      for (let i = 0; i < 60; i++) {
        existing.push(pickCollectionName("x.png", []));
      }
      const unique = [...new Set(existing)];

      // Now try with all those names blocked
      resetRng();
      const fallback = pickCollectionName("x.png", unique);
      expect(fallback).toMatch(/-\d+$/);
    });

    it("should use 'Palet' when source name is empty", () => {
      const name = pickCollectionName("", []);
      expect(name).toContain("Palet");
    });
  });
});
