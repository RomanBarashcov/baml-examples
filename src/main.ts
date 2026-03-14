import "dotenv/config";
import { b, Message, MovieTool, MusicTool, WeatherTool, SkipTool } from "../baml_client";
import * as readline from "readline";
import { BamlStream } from "@boundaryml/baml";
import { Session } from "./state/session";
import { ToolCall } from "./state/toolCall";
import { toolRouter } from "./router/toolRouter";
import { weatherHandler, WeatherToolResponse } from "./tools/weatherTool";
import { movieHandler, MovieToolResponse } from "./tools/movieTool";
import { musicHandler, MusicToolResponse } from "./tools/musicTool";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const MAX_HISTORY = 10;

/**
 * getRecentHistory - get recent history
 * @param msgs - messages
 * @returns Message[]
 */
function getRecentHistory(msgs: Message[]): Message[] {
  return msgs.length <= MAX_HISTORY ? msgs : msgs.slice(-MAX_HISTORY);
}

/**
 * askQuestion - ask user question
 * @param query - question
 * @returns Promise<string>
 */
function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * streamHandler - stream response from BAML
 * @param stream - BAML stream
 * @returns Promise<string>
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
 * main - main function
 */
async function main() {
  let executing = true;
  const session = new Session();

  await toolRouter.initialize();

  while (executing) {
    let content = await askQuestion("Enter your message (or 'quit' to exit): ");

    if (content.trim().toLocaleLowerCase() === "quit") {
      console.log("Exiting...");
      executing = false;
      break;
    }

    session.messages.push({ role: "user", content });

    let useToolResponse: WeatherTool | MovieTool | MusicTool | SkipTool;
    try {
      useToolResponse = await toolRouter.route(content);

      const toolCall = new ToolCall(
        session.toolCalls.length + 1,
        useToolResponse.name,
        JSON.stringify(useToolResponse)
      );

      session.toolCalls.push(toolCall);
      session.messages.push({ role: "tool", content: `Calling tool: ${useToolResponse.name} with params: ${JSON.stringify(useToolResponse)}` });
    } catch (error) {
      console.error("Sorry, I couldn't understand your request. Please try again.");
      continue;
    }

    if (useToolResponse.name !== "skip_tool_call") {
      let toolResponse: string;
      switch (useToolResponse.name) {
        case "weather_request":
          toolResponse = (weatherHandler(useToolResponse.city) as WeatherToolResponse).context;
          break;
        case "movie_request":
          toolResponse = (movieHandler(useToolResponse.action) as MovieToolResponse).context;
          break;
        case "music_request":
          toolResponse = (musicHandler(useToolResponse.action) as MusicToolResponse).context;
          break;
      }
      session.messages.push({ role: "tool", content: toolResponse });
    } else {
      // Remove the "Calling tool: skip_tool_call" message we just pushed —
      // it adds noise and causes the LLM to think it can't answer from context.
      session.messages.pop();
    }

    const { in_scope: inScope } = await b.IsInScope(content);
    if (!inScope) {
      console.log("Assistant: I can only help with weather, movies, and music.");
      session.messages.push({ role: "assistant", content: "I can only help with weather, movies, and music." });
      continue;
    }

    const stream = b.stream.Chat(getRecentHistory(session.messages));
    const agentResponse = await streamHandler(stream);

    session.messages.push({ role: "assistant", content: agentResponse });
  }

  console.log("Stop Executing...:");
  rl.close();
}

main().then(r => r).catch(e => console.error("Error:", e));
