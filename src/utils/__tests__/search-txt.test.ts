import { describe, it, expect } from "vitest";
import {
  buildSearchTxt,
  parseSearchTxtQuery,
  matchesAllSearchTerms,
  normalizeSearchText,
} from "../search-txt";

const CHARIZARD = buildSearchTxt(["Pokémon Charizard PSA 9"]);

describe("normalizeSearchText", () => {
  it("folds accents so 'pokemon' finds 'Pokémon'", () => {
    expect(normalizeSearchText("Pokémon")).toBe("pokemon");
  });

  it("collapses punctuation to word boundaries", () => {
    expect(normalizeSearchText("Beyblade-X: Dran/Sword!")).toBe("beyblade x dran sword");
  });
});

describe("buildSearchTxt", () => {
  it("matches a mid-title word by prefix — the whole point", () => {
    // This is the case a plain string field cannot do: "charizard" is not a
    // prefix of "pokemon charizard psa 9".
    expect(CHARIZARD).toContain("charizard");
    expect(CHARIZARD).toContain("chari");
    expect(CHARIZARD).toContain("ch");
  });

  it("is case- and accent-insensitive", () => {
    expect(CHARIZARD).toContain("pokemon");
    expect(CHARIZARD).not.toContain("Pokémon");
  });

  it("supports a single-character query", () => {
    // The old token builder dropped anything under 2 chars, which made a 1-char
    // search silently return the entire unfiltered list.
    expect(CHARIZARD).toContain("c");
  });

  it("does not emit prefixes when asked not to", () => {
    const whole = buildSearchTxt(["charizard"], { prefix: false });
    expect(whole).toEqual(["charizard"]);
  });

  it("caps prefix length", () => {
    const t = buildSearchTxt(["extraordinarily"], { maxPrefixLength: 5 });
    expect(t).toContain("extra");
    expect(t).not.toContain("extrao");
    expect(t).toContain("extraordinarily"); // whole word always kept
  });

  it("respects the token ceiling", () => {
    const many = Array.from({ length: 500 }, (_, i) => `word${i}`);
    expect(buildSearchTxt(many, { maxTokens: 50 })).toHaveLength(50);
  });

  it("accepts mixed strings and arrays and ignores nullish", () => {
    const t = buildSearchTxt(["Dranzer", ["spin", "top"], undefined, null]);
    expect(t).toEqual(expect.arrayContaining(["dranzer", "spin", "top"]));
  });

  it("deduplicates", () => {
    expect(new Set(buildSearchTxt(["top top top"])).size).toBe(
      buildSearchTxt(["top top top"]).length,
    );
  });
});

describe("parseSearchTxtQuery", () => {
  it("orders terms longest-first so the most selective becomes the clause", () => {
    expect(parseSearchTxtQuery("red dranzer")).toEqual(["dranzer", "red"]);
  });

  it("shares the write-side normalizer", () => {
    expect(parseSearchTxtQuery("Pokémon!")).toEqual(["pokemon"]);
  });

  it("returns nothing for an empty query", () => {
    expect(parseSearchTxtQuery("   ")).toEqual([]);
  });
});

describe("matchesAllSearchTerms", () => {
  it("requires EVERY term — AND, not OR", () => {
    // array-contains-any is OR, which is why "shipping cost" used to return
    // everything matching either word.
    const tokens = buildSearchTxt(["Red Dranzer Spin Top"]);
    expect(matchesAllSearchTerms(tokens, ["dranzer", "red"])).toBe(true);
    expect(matchesAllSearchTerms(tokens, ["dranzer", "blue"])).toBe(false);
  });

  it("an empty term list matches everything", () => {
    expect(matchesAllSearchTerms(["a"], [])).toBe(true);
  });

  it("a document with no tokens matches nothing", () => {
    expect(matchesAllSearchTerms(undefined, ["x"])).toBe(false);
  });
});
