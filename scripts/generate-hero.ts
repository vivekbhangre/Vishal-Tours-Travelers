import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generate() {
  console.log("Generating image...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: 'Ultra-wide cinematic hero background for a travel booking website, highly detailed luxury road trip theme with scenic mountain highway sunset, panoramic view, soft atmospheric lighting, premium modern aesthetic, subtle motion blur on road, ultra high resolution, vibrant colors that blend well with deep purple gradients, spacious negative space on left side for text overlay, crisp and professional UI hero image.',
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir);
        }
        fs.writeFileSync(path.join(publicDir, 'hero-bg.png'), Buffer.from(base64EncodeString, 'base64'));
        console.log('Image saved to public/hero-bg.png');
      }
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
}

generate();
