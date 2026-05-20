import { describe, it, expect } from "vitest";
import { expandFilterAliases, type SieveFilterAliases } from "../filter-aliases";

describe("expandFilterAliases", () => {
  it("returns undefined when filters is undefined", () => {
    const aliases: SieveFilterAliases = { scope: () => "status==active" };
    expect(expandFilterAliases(undefined, aliases)).toBeUndefined();
  });

  it("returns filters unchanged when aliases is undefined", () => {
    expect(expandFilterAliases("status==active", undefined)).toBe("status==active");
  });

  it("returns filters unchanged when aliases is empty object", () => {
    expect(expandFilterAliases("status==active", {})).toBe("status==active");
  });

  it("expands a single alias clause", () => {
    const aliases: SieveFilterAliases = {
      scope: (value) =>
        value === "publicAuctions" ? "status==published,listingType==auction" : "",
    };
    expect(expandFilterAliases("scope==publicAuctions", aliases)).toBe(
      "status==published,listingType==auction",
    );
  });

  it("passes the operator to the alias function", () => {
    const received: { value: string; op: string }[] = [];
    const aliases: SieveFilterAliases = {
      myField: (value, op) => {
        received.push({ value, op });
        return "x==1";
      },
    };
    expandFilterAliases("myField!=foo", aliases);
    expect(received).toEqual([{ value: "foo", op: "!=" }]);
  });

  it("expands an alias and passes through unknown clauses", () => {
    const aliases: SieveFilterAliases = {
      scope: () => "status==published,listingType==auction",
    };
    const result = expandFilterAliases("scope==publicAuctions,storeId==store-abc", aliases);
    expect(result).toBe("status==published,listingType==auction,storeId==store-abc");
  });

  it("passes through a clause whose field has no alias", () => {
    const aliases: SieveFilterAliases = { scope: () => "status==active" };
    expect(expandFilterAliases("category==brand-pokemon", aliases)).toBe("category==brand-pokemon");
  });

  it("drops a clause when the alias returns empty string", () => {
    const aliases: SieveFilterAliases = {
      scope: () => "",
    };
    expect(expandFilterAliases("scope==unknown", aliases)).toBe("");
  });

  it("drops an empty-expansion clause while keeping other clauses", () => {
    const aliases: SieveFilterAliases = {
      scope: (value) => (value === "known" ? "status==active" : ""),
    };
    const result = expandFilterAliases("scope==notknown,listingType==standard", aliases);
    expect(result).toBe("listingType==standard");
  });

  it("handles multiple alias fields in one filter string", () => {
    const aliases: SieveFilterAliases = {
      scope: () => "status==active",
      type: () => "listingType==auction",
    };
    const result = expandFilterAliases("scope==any,type==any", aliases);
    expect(result).toBe("status==active,listingType==auction");
  });

  it("trims whitespace around clauses", () => {
    const aliases: SieveFilterAliases = { scope: () => "status==active" };
    const result = expandFilterAliases(" scope==x , name==foo ", aliases);
    expect(result).toBe("status==active,name==foo");
  });

  it("passes through a clause that does not match the operator pattern", () => {
    const aliases: SieveFilterAliases = { scope: () => "status==active" };
    // A malformed clause has no operator — should pass through unchanged
    expect(expandFilterAliases("malformed", aliases)).toBe("malformed");
  });

  it("handles @= operator", () => {
    const received: string[] = [];
    const aliases: SieveFilterAliases = {
      tags: (_v, op) => { received.push(op); return "tags@=value"; },
    };
    expandFilterAliases("tags@=value", aliases);
    expect(received[0]).toBe("@=");
  });

  it("handles @=* operator", () => {
    const received: string[] = [];
    const aliases: SieveFilterAliases = {
      tags: (_v, op) => { received.push(op); return "tags@=*value"; },
    };
    expandFilterAliases("tags@=*value", aliases);
    expect(received[0]).toBe("@=*");
  });

  it("returns empty string when all clauses expand to empty", () => {
    const aliases: SieveFilterAliases = { scope: () => "" };
    expect(expandFilterAliases("scope==x", aliases)).toBe("");
  });
});
