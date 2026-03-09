import "dotenv/config";
import { b, Message, MovieTool, MusicTool, WeatherTool, SkipTool } from "../baml_client";
import * as readline from "readline";
import { BamlStream } from "@boundaryml/baml";
import { Session } from "./state/session";
import { ToolCall } from "./state/toolCall";
import { toolRouter } from "./router/toolRouter";

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
 * weatherHandler - returned weather info
 * @param city - city name
 * @returns string
 */
function weatherHandler(city: string): string {
  console.log(`Fetching weather for ${city}...`);
  return `In ${city} right now +25с`
}

/**
 * movieHandler - returned list of movies
 * @param action - top or search
 * @returns string
 * */
function movieHandler(action: string): string {
  console.log(`Fetching movie ${action}...`);

  let movies = ["Avatar: Fire and Ash", "Zootopia 2", "The Mandalorian and Grogu", "28 Years Later: The Bone Temple", "Avengers: Doomsday"];

  switch (action) {
    case "top":
      return `Here is a top 5 movies in this 2026 year: ${movies.join(", ")}`;
    case "search":
      return `Here is a list of movies by user search: ${movies.join(", ")}`;
  }

  return `Incorrect action: ${action}`;
}

/**
 * musicHandler - returned list of music
 * @param action - top or search
 * @returns string
 */
function musicHandler(action: string): string {
  console.log(`Fetching music ${action}...`);

  let albums = ["J. Cole - The Fall-Off", "A$AP Rocky - Don't Be Dumb", "Converge - Love Is Not Enough", "Jill Scott - To Whom This May Concern", "By Storm - My Ghosts Go Ghost"]

  switch (action) {
    case "top":
      return `Here is a top 5 music albums in this 2026 year: ${albums.join(", ")}`;
    case "search":
      return `Here is a list of music albums by user search: ${albums.join(", ")}`;
  }

  return `Incorrect action: ${action}`;
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
    } catch (error) {
      console.error("Sorry, I couldn't understand your request. Please try again.");
      continue;
    }

    let toolResponse: string;
    switch (useToolResponse.name) {
      case "skip_tool_call":
        console.log("Skipping API call...");
        toolResponse = "Sorry, I couldn't understand your request. Please try again.";
        break;
      case "weather_request":
        toolResponse = weatherHandler(useToolResponse.city);
        break;
      case "movie_request":
        toolResponse = movieHandler(useToolResponse.action);
        break;
      case "music_request":
        toolResponse = musicHandler(useToolResponse.action);
    }

    session.messages.push({ role: "assistant", content: toolResponse });

    const stream = b.stream.Chat(getRecentHistory(session.messages));
    const agentResponse = await streamHandler(stream);

    session.messages.push({ role: "assistant", content: agentResponse });
  }

  console.log("Stop Executing...:");
  rl.close();
}

main().then(r => r).catch(e => console.error("Error:", e));
