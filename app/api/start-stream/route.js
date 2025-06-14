import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request) {
  try {
    const { mode } = await request.json();
    console.log("Start stream request received:", { mode });
    if (!["desktop", "camera"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const sessionId = uuidv4();
    return NextResponse.json({
      status: `${mode} stream started`,
      redirect: `/chat/${mode}`,
      session_id: sessionId,
    });
  } catch (error) {
    console.error("Start stream error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
