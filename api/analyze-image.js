export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });

    const GEMINI_KEY = process.env.GEMINI_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: "GEMINI_KEY not set in Vercel environment" });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
              {
                text: `Analyze this image in detail for social media marketing. Describe:
1) What is shown in the image
2) The mood and emotion it conveys
3) Colors and visual style
4) Any visible text, products, or brands
5) How this image could be used for social media marketing
Be specific and detailed in 150 words.`
              }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: "Gemini error: " + data.error.message });

    const description = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.status(200).json({ description });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
