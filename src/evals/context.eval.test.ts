import "dotenv/config";
import { describe, it, expect } from "vitest";
import { b } from "../../baml_client";

const MUSIC_TOOL_CONTEXT = `
tool: music_request response -> The Fall-Off by J. Cole (2026) [Hip-Hop] - Rating: 8.8. J. Cole's highly anticipated album exploring personal growth.
tool: music_request response -> Don't Be Dumb by A$AP Rocky (2026) [Rap] - Rating: 8.2. A$AP Rocky returns with energetic beats and clever lyrics.
tool: music_request response -> To Whom This May Concern by Jill Scott (2026) [Soul] - Rating: 8.5. Jill Scott's soulful melodies and heartfelt lyrics shine.
`.trim();

const CONTEXT_FOLLOWUP_CASES: { label: string; history: { role: "user" | "assistant" | "tool"; content: string }[]; followUp: string; expectation: string }[] = [
  {
    label: "Context: confirm A$AP Rocky rating from prior music results",
    history: [
      { role: "user", content: "what is best music right now?" },
      { role: "tool", content: MUSIC_TOOL_CONTEXT },
      { role: "assistant", content: "Here are the top albums right now: J. Cole (8.8), Jill Scott (8.5), A$AP Rocky (8.2)." },
    ],
    followUp: "I am correctly understand A$AP Rocky have 8.2 rating ?",
    expectation: "The assistant confirms that A$AP Rocky's rating is 8.2 based on the tool context.",
  },
  {
    label: "Context: identify highest rated album from prior music results",
    history: [
      { role: "user", content: "what is best music right now?" },
      { role: "tool", content: MUSIC_TOOL_CONTEXT },
      { role: "assistant", content: "Here are the top albums right now: J. Cole (8.8), Jill Scott (8.5), A$AP Rocky (8.2)." },
    ],
    followUp: "which album has the highest rating?",
    expectation: "The assistant answers that J. Cole's The Fall-Off has the highest rating of 8.8.",
  },
  {
    label: "Context: ask about artist genre from prior music results",
    history: [
      { role: "user", content: "what is best music right now?" },
      { role: "tool", content: MUSIC_TOOL_CONTEXT },
      { role: "assistant", content: "Here are the top albums right now: J. Cole (8.8), Jill Scott (8.5), A$AP Rocky (8.2)." },
    ],
    followUp: "what genre is Jill Scott?",
    expectation: "The assistant answers that Jill Scott is Soul genre based on the tool context.",
  },
];

describe("Context follow-up evaluations (LLM-as-judge)", () => {
  for (const tc of CONTEXT_FOLLOWUP_CASES) {
    it(tc.label, async () => {
      const messages = [
        ...tc.history,
        { role: "user" as const, content: tc.followUp },
      ];
      const actual = await b.Chat(messages);
      const conversation = tc.history
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n") + `\nuser: ${tc.followUp}`;
      const result = await b.EvaluateChat(conversation, actual, tc.expectation);
      expect(result.passed, result.reasoning).toBe(true);
    }, 30_000);
  }
});
