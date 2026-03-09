
class WeatherTool {
    name "weather_request"
    city string
}

class MovieTool {
    name "movie_request"
    action "search" | "top"
}

class MusicTool {
    name "music_request"
    action "search" | "top"
}

class SkipTool {
    name "skip_tool_call" @description("Skip tool call when user request is not related to other tools")
    action "skip"
}

function ExtractWeatherParams(user_input: string) -> WeatherTool {
    client "LFModel"
    prompt #"
        Extract the city name from this weather request.
        {{ ctx.output_format }}
        {{ _.role('user') }}
        {{ user_input }}
    "#
}

function ExtractMovieParams(user_input: string) -> MovieTool {
    client "LFModel"
    prompt #"
        Determine whether the user wants to search for a specific movie or see top/popular movies.
        {{ ctx.output_format }}
        {{ _.role('user') }}
        {{ user_input }}
    "#
}

function ExtractMusicParams(user_input: string) -> MusicTool {
    client "LFModel"
    prompt #"
        Determine whether the user wants to search for specific music or see top/popular music.
        {{ ctx.output_format }}
        {{ _.role('user') }}
        {{ user_input }}
    "#
}

class Message {
    role "user" | "assistant" | "tool"
    content string
}

function Chat(messages: Message[]) -> string {
    client "LFModel"
    prompt #"
        Answer the user's question based on the following conversation history especially the system answers:
        {% for message in messages %}
            {{ _.role(message.role) }}:
            {{ message.content }}
        {% endfor %}
        Answer:
    "#
}

function SummarizeHistory(messages: Message[]) -> string {
    client "LFModel"
    prompt #"
        Summarize this conversation in 2-3 sentences, preserving key facts:
        {% for message in messages %}
            {{ _.role(message.role) }}: {{ message.content }}
        {% endfor %}
    "#
}

test TestChat {
    functions [Chat]
    args {
        messages [
            {
                role: "user"
                content: "Hello, how are you?"
            },
            {
                role: "assistant"
                content: "I'm fine, thank you!"
            }
        ]
    }
}