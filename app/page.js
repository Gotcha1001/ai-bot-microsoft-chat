// "use client";
// import { useState } from "react";
// import { useRouter } from "next/navigation";

// export default function Home() {
//   const [response, setResponse] = useState("");
//   const router = useRouter();

//   function startStream(mode) {
//     setResponse("");
//     fetch("/api/start-stream", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ mode }),
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         if (data.error) {
//           setResponse(data.error);
//         } else if (data.redirect) {
//           router.push(data.redirect);
//         } else {
//           setResponse(data.status);
//         }
//       })
//       .catch((err) => {
//         setResponse("Error starting stream: " + err.message);
//       });
//   }

//   return (
//     <div className="text-center max-w-2xl p-6 rounded-lg shadow-lg">
//       <h1 className="text-4xl font-bold mb-4">Welcome to the AI Assistant</h1>
//       <img
//         src="/image.jpeg"
//         alt="AI Assistant"
//         className="w-full h-64 object-cover rounded-lg mb-6"
//       />
//       <p className="mb-6">
//         Experience our AI-powered assistant that can analyze your desktop or
//         camera feed. Choose your mode below and interact via voice commands.
//       </p>
//       <div className="flex justify-center space-x-4">
//         <button
//           onClick={() => startStream("desktop")}
//           className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300"
//         >
//           Desktop Mode
//         </button>
//         <button
//           onClick={() => startStream("camera")}
//           className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300"
//         >
//           Camera Mode
//         </button>
//         <a
//           href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
//           target="_blank"
//           rel="noopener noreferrer"
//           className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300"
//         >
//           Watch AI Video Launch
//         </a>
//       </div>
//       <div id="response" className="mt-6 text-lg">
//         {response}
//       </div>
//     </div>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [response, setResponse] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) ||
        window.innerWidth <= 768 ||
        "ontouchstart" in window;
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const showBrowserWarning = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      return (
        <div className="mt-4 p-3 bg-orange-600 bg-opacity-70 rounded-lg">
          <p className="text-sm">
            ⚠️ For best results on iOS, please use Chrome instead of Safari
          </p>
        </div>
      );
    }
    return null;
  };

  function startStream(mode) {
    setResponse("");
    if (isMobile && mode === "desktop") {
      setResponse(
        "Desktop mode not available on mobile. Redirecting to camera mode..."
      );
      setTimeout(() => startStream("camera"), 2000);
      return;
    }

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
      <h1 className="text-4xl font-bold mb-4">
        Welcome to the AI Assistant
        {isMobile && (
          <span className="text-lg block text-gray-400 mt-2">
            Mobile Version
          </span>
        )}
      </h1>
      {showBrowserWarning()}
      <img
        src="/image.jpeg"
        alt="AI Assistant"
        className="w-full h-64 object-cover rounded-lg mb-6"
      />
      <p className="mb-6">
        Experience our AI-powered assistant that can analyze your{" "}
        {isMobile ? "camera" : "desktop or camera"} feed.
        {isMobile
          ? " Camera mode optimized for mobile."
          : " Choose your mode below and interact via voice commands."}
      </p>
      <div className="flex justify-center space-x-4 flex-wrap">
        {!isMobile && (
          <button
            onClick={() => startStream("desktop")}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 mb-2"
          >
            Desktop Mode
          </button>
        )}
        <button
          onClick={() => startStream("camera")}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 mb-2"
        >
          {isMobile ? "Start Camera" : "Camera Mode"}
        </button>
        <a
          href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 mb-2"
        >
          Watch AI Video Launch
        </a>
      </div>
      {isMobile && (
        <div className="mt-4 p-3 bg-blue-600 bg-opacity-20 rounded-lg">
          <p className="text-sm text-blue-200">
            📱 Mobile Tips: Allow microphone and camera permissions when
            prompted. Use in a well-lit area and speak clearly.
          </p>
        </div>
      )}
      <div id="response" className="mt-6 text-lg">
        {response}
      </div>
    </div>
  );
}
