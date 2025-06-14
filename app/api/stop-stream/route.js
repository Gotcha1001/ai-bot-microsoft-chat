import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { mode, session_id } = await request.json();
    if (!["desktop", "camera"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    return NextResponse.json({
      status: `${mode} stream stopped`,
      redirect: "/",
    });
  } catch (error) {
    console.error("Stop stream error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
