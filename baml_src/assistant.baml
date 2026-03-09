
class WeatherAPI {
    api_name "weather_request"
    city string
}

class MovieAPI {
    api_name "movie_request"
    action "search" | "top"
}

class MusicAPI {
    api_name "music_request"
    action "search" | "top"
}

class SkipAPICall {
    api_name "skip_api_call" @description("Skip API call when user request is not related to other APIs")
    action "skip"
}

function UseTool(user_input: string) -> WeatherAPI | MovieAPI | MusicAPI | SkipAPICall {
    client "LFModel"
    prompt #"
        Classify the user request and extract structured data.
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