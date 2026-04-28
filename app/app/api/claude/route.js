export async function POST(request) {
  try {
    const { messages, system, model = 'claude-sonnet-4-6' } = await request.json();

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: 2048, system, messages }),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    return Response.json({ content: data.content[0]?.text ?? '' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
