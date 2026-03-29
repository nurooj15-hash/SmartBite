const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const AbortController = global.AbortController || require('abort-controller');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.options('*', cors());
app.use(express.json({ limit: '20mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, message: 'SmartBite backend is running' });
});

app.post('/analyze-meal', async (req, res) => {
  try {
    const { base64, goal } = req.body || {};

    if (!base64) {
      return res.status(400).json({ error: 'Missing image data.' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY on server.' });
    }

    const selectedGoal = goal || 'blood sugar management';

    const prompt = `
You are SmartBite AI.

Analyze the meal image and return ONLY valid JSON.
Do not include markdown.
Do not include backticks.
Do not include any explanation outside the JSON.

Return this exact shape:
{
  "foodsDetected": ["string"],
  "nutritionEstimate": {
    "calories": "string",
    "carbs": "string",
    "protein": "string",
    "fat": "string",
    "fiber": "string"
  },
  "cuisine": "string",
  "healthTip": "string",
  "confidenceNote": "string"
}

Rules:
- Identify visible foods and drinks.
- Estimate calories, carbs, protein, fat, and fiber.
- Infer cuisine type if possible.
- Tailor the healthTip to this user goal: ${selectedGoal}.
- Be concise.
- If uncertain, say so in confidenceNote.
- Use ranges when appropriate.
- Return valid JSON only.
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt,
              },
              {
                type: 'input_image',
                image_url: `data:image/jpeg;base64,${base64}`,
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      return res.status(openaiResponse.status).json({
        error:
          data?.error?.message ||
          `OpenAI request failed with status ${openaiResponse.status}.`,
      });
    }

    const text =
      data.output_text ||
      (data.output || [])
        .flatMap((item) => item.content || [])
        .find((item) => item.type === 'output_text')
        ?.text ||
      '';

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: 'Model returned invalid JSON.',
        raw: text,
      });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Analysis timed out. Try a clearer or smaller image.',
      });
    }

    return res.status(500).json({
      error: error?.message || 'Server error.',
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SmartBite server running on port ${PORT}`);
});