class EvalResult {
    passed bool
    reasoning string
}

function EvaluateChat(
    conversation: string,
    actual_response: string,
    expectation: string
) -> EvalResult {
    client "LFModel"
    prompt #"
        You are an evaluation judge for a conversational assistant.
        Given a conversation (including tool responses), the assistant's actual reply, and a plain-English expectation, determine whether the reply satisfies the expectation.

        Consider it PASSED if the assistant's reply addresses the expectation using information present in the conversation.
        Consider it FAILED if the assistant says it cannot answer, hallucinates facts not in the conversation, or ignores relevant context.

        {{ ctx.output_format }}

        {{ _.role('user') }}
        Conversation:
        {{ conversation }}

        Assistant reply: {{ actual_response }}
        Expectation: {{ expectation }}
    "#
}

function EvaluateToolCall(
    user_input: string,
    actual_output: string,
    expected_output: string
) -> EvalResult {
    client "LFModel"
    prompt #"
        You are an evaluation judge for a tool-routing assistant.
        Given a user message, an actual tool call result (JSON), and the expected result (JSON),
        determine whether the actual output is correct.

        Consider it PASSED if:
        - The "name" field matches exactly.
        - All other fields match in value and type.
        - String fields like "city" may vary in capitalization but must refer to the same place.

        {{ ctx.output_format }}

        {{ _.role('user') }}
        User input: {{ user_input }}
        Expected: {{ expected_output }}
        Actual: {{ actual_output }}
    "#
}

