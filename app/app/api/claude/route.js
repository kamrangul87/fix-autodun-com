export async function POST(request) {
  try {
    const body = await request.json();
    const { useWebSearch, model = 'claude-sonnet-4-6', max_tokens = 2048, ...rest } = body;

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };
    if (useWebSearch) headers['anthropic-beta'] = 'web-search-2025-03-05';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...rest,
        model,
        max_tokens,
        tools: useWebSearch ? [{ type: 'web_search_20250305', name: 'web_search' }] : undefined,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    // Find the last text block — handles responses that mix tool_use and text blocks
    const textBlock = [...(data.content ?? [])].reverse().find(b => b.type === 'text');
    return Response.json({ content: textBlock?.text ?? '' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
