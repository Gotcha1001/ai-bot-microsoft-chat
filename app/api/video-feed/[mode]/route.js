import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { mode } = params;

  const generate = async function* () {
    while (true) {
      const frame = Buffer.from("");
      yield Buffer.concat([
        Buffer.from("--frame\r\nContent-Type: image/jpeg\r\n\r\n"),
        frame,
        Buffer.from("\r\n"),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  return new Response(generate(), {
    headers: {
      "Content-Type": "multipart/x-mixed-replace; boundary=frame",
    },
  });
}
