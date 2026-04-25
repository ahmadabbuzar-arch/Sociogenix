export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { topic, platforms, language, imageContext } = req.body;
    if (!topic || !platforms || !language) {
      return res.status(400).json({ error: "topic, platforms, language required" });
    }

    const GROQ_KEY = process.env.GROQ_KEY;
    if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_KEY not set in Vercel environment" });

    const platformList = platforms.join(", ");

    const prompt = `${imageContext ? "Image analysis: " + imageContext + "\n\n" : ""}Generate highly optimized social media content for: ${platformList}.
Topic: "${topic}"
Language: ${language}

Return ONLY valid JSON (no markdown, no code fences, no extra text):
{
  "instagram":{"caption":"...","hashtags":"..."},
  "youtube":{"title":"...","description":"...","tags":"..."},
  "facebook":{"caption":"...","hashtags":"..."},
  "twitter":{"tweet":"...","hashtags":"..."},
  "linkedin":{"post":"...","hashtags":"..."},
  "tiktok":{"caption":"...","hashtags":"..."},
  "pinterest":{"title":"...","description":"...","keywords":"..."}
}
Rules:
- Instagram: emoji-rich caption 150-200 chars + 25 hashtags (trending + niche mix)
- YouTube: SEO title max 70 chars + 300-word description + 15 comma-separated tags
- Facebook: shareable caption + 8 hashtags
- Twitter: viral tweet max 280 chars + 4 hashtags
- LinkedIn: professional storytelling 200-300 words + 5 hashtags
- TikTok: catchy caption under 100 chars + 10 trending hashtags
- Pinterest: SEO title + 150-char description + 10 comma-separated keywords
- If Hindi: Devanagari script for content, English hashtags
- Only include platforms: ${platformList}
- Make content genuinely engaging and platform-specific`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 3000,
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: "You are a world-class social media content strategist. Always respond with ONLY valid JSON — no markdown, no explanation, no code fences."
          },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: "Groq error: " + data.error.message });

    const raw = data.choices?.[0]?.message?.content || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "AI ne valid JSON nahi diya. Dobara try karo." });

    return res.status(200).json(JSON.parse(match[0]));

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
