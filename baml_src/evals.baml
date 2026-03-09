class EvalResult {
    passed bool
    reasoning string
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

