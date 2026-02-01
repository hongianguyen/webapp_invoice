const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.static(__dirname));

app.post('/api/ocr', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not set on server.' });
  }

  const { imageBase64 } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required.' });
  }

  try {
    if (typeof fetch !== 'function') {
      return res.status(500).json({ error: 'Node.js 18+ required for fetch().' });
    }

    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text:
                    'Extract all text from this receipt/invoice image. Return only the text as plain lines, no extra commentary.',
                },
                {
                  inline_data: { mime_type: 'image/jpeg', data: imageBase64 },
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await apiRes.json();
    if (!apiRes.ok) {
      const detail = data?.error?.message ? ` ${data.error.message}` : '';
      return res.status(apiRes.status).json({ error: 'Gemini API request failed.' + detail });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';
    return res.json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
