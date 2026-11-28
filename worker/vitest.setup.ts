/**
 * Tests are hermetic. A shell that exported ANTHROPIC_API_KEY for a real
 * eval would otherwise switch textClient() to the real Claude adapter
 * (lib/text-llm.ts), and every fake call in a test that mocks the OpenAI
 * class would become a paid Claude call. Without the key, and with no
 * LLM_PROVIDER from the shell, text defaults to the mocked OpenAI client.
 * Tests of the Claude path pass their own env or a fake Messages API.
 */
delete process.env.ANTHROPIC_API_KEY;
delete process.env.LLM_PROVIDER;
