import "dotenv/config";
import { b, Message, WeatherTool, MovieTool, MusicTool } from "../baml_client";
import * as readline from "node:readline";
import { BamlStream } from "@boundaryml/baml";
import { Session } from "./state/session";
import { ToolCall } from "./state/toolCall";
import { toolRouter, HIGH_CONFIDENCE_THRESHOLD } from "./router/toolRouter";
import { weatherHandler } from "./tools/weatherTool";
import { movieHandler } from "./tools/movieTool";
import { musicHandler } from "./tools/musicTool";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const MAX_HISTORY = 10;

/**
 * getRecentHistory - returns the last N messages from the session.
 * @param msgs - full message array
 * @returns the most recent MAX_HISTORY messages
 */
function getRecentHistory(msgs: Message[]): Message[] {
  if (msgs.length <= MAX_HISTORY) return msgs;
  return msgs.slice(-MAX_HISTORY);
}

/**
 * askQuestion - prompts the user for input via stdin.
 * @param query - the prompt string to display
 * @returns the user's input
 */
function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * streamHandler - consumes a BAML stream and writes each delta to stdout.
 * @param stream - the BAML stream to consume
 * @returns the complete final response string
 */
async function streamHandler(stream: BamlStream<string, string>): Promise<string> {
  let printed = 0;

  process.stdout.write("Assistant: ");

  for await (const partial of stream) {
    if (partial) {
      const delta = partial.slice(printed);
      if (delta) process.stdout.write(delta);
      printed = partial.length;
    }
  }

  process.stdout.write("\n");

  return await stream.getFinalResponse();
}

/**
 * fetchToolContext - executes the matched tool and returns its LLM-readable context string.
 * @param tool - the matched tool result (must not be SkipTool)
 * @returns formatted context string for the LLM
 */
function fetchToolContext(tool: WeatherTool | MovieTool | MusicTool): string {
  switch (tool.name) {
    case "weather_request":
      return weatherHandler(tool.city).context;
    case "movie_request":
      return movieHandler(tool.action).context;
    case "music_request":
      return musicHandler(tool.action).context;
    default:
      return "";
  }
}

/**
 * streamChatResponse - streams a chat response and appends it to the session.
 * @param session - current conversation session
 */
async function streamChatResponse(session: Session): Promise<void> {
  const stream = b.stream.Chat(getRecentHistory(session.messages));
  const agentResponse = await streamHandler(stream);
  session.messages.push({ role: "assistant", content: agentResponse });
}

/**
 * classifyInput - classifies user input via embeddings.
 * @param content - raw user input
 * @returns tool name and confidence score, or null if routing failed
 */
async function classifyInput(content: string): Promise<{ tool: string; score: number } | null> {
  try {
    return await toolRouter.classify(content);
  } catch (error) {
    console.error("Routing failed:", error);
    return null;
  }
}

/**
 * isInScope - checks whether a medium-confidence request is within the assistant's scope.
 * @param content - raw user input
 * @returns true if in scope or if the scope check passes
 */
async function isInScope(content: string): Promise<boolean> {
  const scopeCheck = await b.IsInScope(content);
  if (!scopeCheck.in_scope) {
    console.log("Assistant: I can only help with weather, movies, and music.");
    return false;
  }
  return true;
}

/**
 * executeToolAndRecordContext - extracts tool params, records the tool call, and appends context.
 * @param session - current conversation session
 * @param toolName - the classified tool name
 * @param content - raw user input
 */
async function executeToolAndRecordContext(session: Session, toolName: string, content: string): Promise<void> {
  const useToolResponse = await toolRouter.extract(toolName, content) as WeatherTool | MovieTool | MusicTool;

  session.toolCalls.push(
    new ToolCall(session.toolCalls.length + 1, useToolResponse.name, JSON.stringify(useToolResponse))
  );
  session.messages.push(
    { role: "tool", content: `Calling tool: ${useToolResponse.name} with params: ${JSON.stringify(useToolResponse)}` },
    { role: "tool", content: fetchToolContext(useToolResponse) },
  );
}

/**
 * processTurn - handles a single user turn: routes, checks scope, executes tool, and streams a reply.
 * High-confidence routes (score >= HIGH_CONFIDENCE_THRESHOLD) skip the LLM scope check.
 * @param session - current conversation session
 * @param content - raw user input
 */
async function processTurn(session: Session, content: string): Promise<void> {
  session.messages.push({ role: "user", content });

  const classification = await classifyInput(content);
  if (!classification) {
    session.messages.pop();
    return;
  }

  const { tool, score } = classification;

  if (tool === "skip_tool_call") {
    await streamChatResponse(session);
    return;
  }

  if (score < HIGH_CONFIDENCE_THRESHOLD && !(await isInScope(content))) {
    session.messages.push({ role: "assistant", content: "I can only help with weather, movies, and music." });
    return;
  }

  await executeToolAndRecordContext(session, tool, content);
  await streamChatResponse(session);
}

/**
 * main - runs the assistant REPL loop until the user types 'quit'.
 */
async function main(): Promise<void> {
  const session = new Session();

  await toolRouter.initialize();

  while (true) {
    const content = await askQuestion("Enter your message (or 'quit' to exit): ");

    if (content.trim().toLocaleLowerCase() === "quit") {
      console.log("Exiting...");
      break;
    }

    await processTurn(session, content);
  }

  console.log("Stop Executing...:");
  rl.close();
}

await main();
