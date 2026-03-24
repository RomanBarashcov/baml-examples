import "dotenv/config";
import { describe, it, expect } from "vitest";
import { b } from "../../baml_client";

const SCOPE_CASES: { label: string; input: string; expected: boolean }[] = [
  // Should be in scope
  { label: "Scope: weather query is in scope",           input: "what is the weather in Kyiv?",        expected: true },
  { label: "Scope: movie query is in scope",             input: "show me top movies",                  expected: true },
  { label: "Scope: music query is in scope",             input: "what are the best albums right now?", expected: true },
  { label: "Scope: artist name question is in scope",    input: "tell me more about A$AP Rocky",       expected: true },
  // Should be out of scope
  { label: "Scope: book recommendation is out of scope", input: "recommend me a good book",            expected: false },
  { label: "Scope: SIM card purchase is out of scope",   input: "can you help me buy a SIM card?",     expected: false },
  { label: "Scope: math question is out of scope",       input: "what is 15 * 37?",                    expected: false },
];

describe("IsInScope guard evaluations", () => {
  for (const tc of SCOPE_CASES) {
    it(tc.label, async () => {
      const { in_scope } = await b.IsInScope(tc.input);
      expect(in_scope).toBe(tc.expected);
    }, 30_000);
  }
});
