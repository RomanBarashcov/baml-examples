
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
        {{_.role('system') }}
        Extract the city name from this weather request.
        {{ ctx.output_format }}
        {{ _.role('user') }}
        {{ user_input }}
    "#
}

function ExtractMovieParams(user_input: string) -> MovieTool {
    client "LFModel"
    prompt #"
        {{_.role('system') }}
        Determine whether the user wants to search for a specific movie or see top/popular movies.
        {{ ctx.output_format }}
        {{ _.role('user') }}
        {{ user_input }}
    "#
}

function ExtractMusicParams(user_input: string) -> MusicTool {
    client "LFModel"
    prompt #"
        {{_.role('system') }}
        Determine whether the user wants to search for specific music or see top/popular music.
        {{ ctx.output_format }}
        {{ _.role('user') }}
        {{ user_input }}
    "#
}

class ScopeCheck {
    in_scope bool
}

function IsInScope(user_input: string) -> ScopeCheck {
    client "LFModel"
    prompt #"
        {{ _.role('system') }}
        You are a scope checker for a specialized assistant that only handles weather, movies, and music.
        Set in_scope to true if the user's message is about weather, movies, or music — including follow-up questions about previous results.
        Set in_scope to false for everything else (books, math, shopping, history, etc.).
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
        {{_.role('system') }}
        You are a helpful assistant for weather, movies, and music.
        When tool responses are present in the conversation, base your answer strictly on that data — do not invent information not provided by the tools.
        When answering follow-up questions, use information already present in the conversation history.
        {% for message in messages %}
            {%if message.role == 'tool' %}
                {{ _.role('tool') }}:
                Context: {{ message.content }}
            {% else %}
                {{ _.role(message.role) }}:
                {{ message.content }}
            {% endif %}
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

// ExtractWeatherParams tests
test WeatherTest_BasicCity {
    functions [ExtractWeatherParams]
    args { user_input "What is the weather in Tokyo?" }
}
test WeatherTest_RainingQuery {
    functions [ExtractWeatherParams]
    args { user_input "Is it raining in London right now?" }
}
test WeatherTest_TemperatureQuery {
    functions [ExtractWeatherParams]
    args { user_input "What is the temperature in New York?" }
}
test WeatherTest_ForecastQuery {
    functions [ExtractWeatherParams]
    args { user_input "Will it snow in Kyiv this week?" }
}

// ExtractMovieParams tests
test MovieTest_TopMovies {
    functions [ExtractMovieParams]
    args { user_input "Show me the top movies right now" }
}
test MovieTest_SearchByTitle {
    functions [ExtractMovieParams]
    args { user_input "Search for the movie Inception" }
}
test MovieTest_PopularFilms {
    functions [ExtractMovieParams]
    args { user_input "What are the most popular films this year?" }
}
test MovieTest_SearchByActor {
    functions [ExtractMovieParams]
    args { user_input "Find movies with Tom Hanks" }
}

// ExtractMusicParams tests
test MusicTest_TopSongs {
    functions [ExtractMusicParams]
    args { user_input "What are the top songs right now?" }
}
test MusicTest_SearchArtist {
    functions [ExtractMusicParams]
    args { user_input "Search for music by Taylor Swift" }
}
test MusicTest_BestAlbums {
    functions [ExtractMusicParams]
    args { user_input "Best albums of 2026" }
}
test MusicTest_SearchAlbum {
    functions [ExtractMusicParams]
    args { user_input "Find J. Cole albums" }
}

// SkipTool proxy tests (no ExtractSkipParams — Chat is used to observe unrelated input)
test SkipTest_Greeting {
    functions [Chat]
    args {
        messages [
            {
                role: "user"
                content: "Hello, how are you?"
            }
        ]
    }
}
test SkipTest_Joke {
    functions [Chat]
    args {
        messages [
            {
                role: "user"
                content: "Tell me a joke"
            }
        ]
    }
}
test SkipTest_Math {
    functions [Chat]
    args {
        messages [
            {
                role: "user"
                content: "What is 2 + 2?"
            }
        ]
    }
}
test SkipTest_Identity {
    functions [Chat]
    args {
        messages [
            {
                role: "user"
                content: "Who are you?"
            }
        ]
    }
}