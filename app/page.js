"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [response, setResponse] = useState("");
  const router = useRouter();

  function startStream(mode) {
    setResponse("");
    fetch("/api/start-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setResponse(data.error);
        } else if (data.redirect) {
          router.push(data.redirect);
        } else {
          setResponse(data.status);
        }
      })
      .catch((err) => {
        setResponse("Error starting stream: " + err.message);
      });
  }

  return (
    <div className="text-center max-w-2xl p-6 rounded-lg shadow-lg">
      <h1 className="text-4xl font-bold mb-4">Welcome to the AI Assistant</h1>
      <img
        src="/image.jpeg"
        alt="AI Assistant"
        className="w-full h-64 object-cover rounded-lg mb-6"
      />
      <p className="mb-6">
        Experience our AI-powered assistant that can analyze your desktop or
        camera feed. Choose your mode below and interact via voice commands.
      </p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => startStream("desktop")}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300"
        >
          Desktop Mode
        </button>
        <button
          onClick={() => startStream("camera")}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300"
        >
          Camera Mode
        </button>
        <a
          href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300"
        >
          Watch AI Video Launch
        </a>
      </div>
      <div id="response" className="mt-6 text-lg">
        {response}
      </div>
    </div>
  );
}
