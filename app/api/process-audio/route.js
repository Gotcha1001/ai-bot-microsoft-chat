import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export async function POST(request) {
  try {
    const {
      prompt,
      mode,
      image,
      session_id,
      chat_history = [],
    } = await request.json();

    if (!prompt || !mode || !image || !session_id) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: prompt, mode, image, and session_id are required",
        },
        { status: 400 }
      );
    }

    if (!["desktop", "camera"].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode: must be "desktop" or "camera"' },
        { status: 400 }
      );
    }

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash-latest",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const SYSTEM_PROMPT = `
            You are a witty assistant that uses the chat history and the provided ${mode} feed to answer questions.
            You can see the ${mode} content, including applications, windows, text, images, or the user's appearance and surroundings.
            Help by describing what you see, answering questions, or reading text. Use few words. Be friendly and conversational.
        `;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chat_history.flatMap(({ prompt, response }) => [
        { role: "user", content: prompt },
        { role: "assistant", content: response },
      ]),
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: image },
        ],
      },
    ];

    const response = await model.invoke(messages);
    const responseText = response.content;

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("Error processing audio:", error);
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    );
  }
}
