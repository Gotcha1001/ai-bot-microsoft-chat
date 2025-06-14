import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request, { params }) {
  const { route } = params;
  const body = await request.json();
  const mode = body.mode;
  const sessionId = body.session_id || "default";

  if (route[0] === "process-audio") {
    const prompt = body.prompt?.trim();
    const image = body.image?.split(",")[1]; // Remove data:image/jpeg;base64,
    const chatHistory = body.chat_history || [];

    if (!prompt || !image) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent([
        {
          text: `You are a witty assistant that uses the chat history and the provided ${mode} feed to answer questions. Help by describing what you see, answering questions, or reading text. Use few words. Be friendly and conversational.\n\n${prompt}`,
        },
        { inlineData: { mimeType: "image/jpeg", data: image } },
        ...chatHistory.flatMap(({ prompt, response }) => [
          { text: prompt, role: "user" },
          { text: response, role: "model" },
        ]),
      ]);

      const response = result.response.text().trim();
      return NextResponse.json({ response });
    } catch (err) {
      console.error("LLM error:", err);
      return NextResponse.json(
        { error: "Failed to process prompt" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid route" }, { status: 404 });
}
