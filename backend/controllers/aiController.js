import aiAssistantService from '../services/aiAssistant.service.js';
import fetch from 'node-fetch';

let GoogleGenAI;
try {
  GoogleGenAI = (await import('@google/genai')).GoogleGenAI;
} catch (e) {
  GoogleGenAI = null;
}

export const diagnose = async (req, res) => {
  try {
    const { messages } = req.body;
    console.log(
      'diagnose called, received messages:',
      Array.isArray(messages) ? messages.length : typeof messages
    );

    const last = messages?.slice(-6) || [];

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GENERATIVE_API_KEY;

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    console.log('GEMINI apiKey present?', !!apiKey, 'model:', model);

    if (apiKey) {
      // Build prompt
      const promptParts = [
        'You are role-playing as a mock patient. Answer briefly and consistently about symptoms when asked.',
      ];

      last.forEach((m) => {
        const role = (m.role || 'user').toLowerCase();
        promptParts.push(`${role}: ${m.text}`);
      });

      const prompt = promptParts.join('\n');

      // ✅ Try SDK first
      if (GoogleGenAI) {
        try {
          const client = new GoogleGenAI({ apiKey });

          const result = await client.models.generateContent({
            model,
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 512,
            },
          });

          const text =
            result?.candidates?.[0]?.content?.parts?.[0]?.text ||
            result?.text ||
            JSON.stringify(result);

          return res.json({ success: true, reply: text });
        } catch (err) {
          console.error('GoogleGenAI SDK error:', err?.message || err);
          // fallback to fetch
        }
      }

      // ✅ HTTP fallback (correct Gemini API)
      const encodedModel = encodeURIComponent(model);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent?key=${apiKey}`;

      console.log('Calling Gemini API:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 512,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');

        console.error(
          'Gemini API error:',
          response.status,
          errText || '(empty body)'
        );

        // Friendly fallback
        if (response.status === 404) {
          const fallback =
            last?.length && last.slice(-1)[0].text
              ? `Fallback reply: Based on your symptoms: "${
                  last.slice(-1)[0].text.slice(0, 120)
                }" — model not found. Check GEMINI_MODEL.`
              : 'Fallback reply: Model unavailable.';

          return res.json({ success: true, reply: fallback });
        }

        if (response.status === 403) {
          return res.json({
            success: true,
            reply:
              'Access denied to Gemini API (403). This is likely due to region or project restrictions. Try enabling the API, using a different project, or using a VPN.',
          });
        }

        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();

      console.log(
        'Gemini response:',
        JSON.stringify(data).slice(0, 500)
      );

      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        JSON.stringify(data);

      return res.json({ success: true, reply });
    }

    // ✅ No API key fallback
    const reply =
      last?.length && last.slice(-1)[0].text
        ? `Based on your symptoms: "${
            last.slice(-1)[0].text.slice(0, 120)
          }" — please consult a doctor for a proper diagnosis. (No API key configured)`
        : 'Please describe your symptoms so I can help guide you.';

    return res.json({ success: true, reply });
  } catch (error) {
    console.error('aiController.diagnose error:', error);

    res.status(500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};

export const assistant = async (req, res) => {
  try {
    const userId =
      req.user?.userId || req.user?.sub || req.user?.id || null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User id not found in token',
      });
    }

    const { message } = req.body;

    const result = await aiAssistantService.processMessage(
      userId,
      message
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};