// 'use client';
// import { useState, useEffect, useRef } from 'react';
// import { useRouter, useParams } from 'next/navigation';
// import { v4 as uuidv4 } from 'uuid';

// export default function Chat() {
//     const [responses, setResponses] = useState([]);
//     const [status, setStatus] = useState('');
//     const [isProcessing, setIsProcessing] = useState(false);
//     const [isRecognitionRunning, setIsRecognitionRunning] = useState(false);
//     const [chatHistory, setChatHistory] = useState([]);
//     const videoRef = useRef(null);
//     const canvasRef = useRef(null);
//     const recognitionRef = useRef(null);
//     const streamRef = useRef(null);
//     const isMounted = useRef(false);
//     const hasInitializedStream = useRef(false);
//     const isRecognitionScheduled = useRef(false); // Prevent overlapping recognition
//     const router = useRouter();
//     const { mode } = useParams();
//     const sessionIdRef = useRef(null);

//     const waitForVideo = () => {
//         return new Promise((resolve, reject) => {
//             const timeout = setTimeout(() => reject(new Error('Video load timeout')), 15000);
//             const checkVideo = () => {
//                 if (!videoRef.current) {
//                     clearTimeout(timeout);
//                     reject(new Error('Video element not found'));
//                     return;
//                 }
//                 if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
//                     clearTimeout(timeout);
//                     resolve();
//                 }
//             };
//             if (videoRef.current) {
//                 videoRef.current.onloadedmetadata = checkVideo;
//                 videoRef.current.oncanplay = checkVideo;
//                 videoRef.current.onerror = () => {
//                     clearTimeout(timeout);
//                     reject(new Error('Video load error'));
//                 };
//                 checkVideo();
//                 if (videoRef.current.paused) {
//                     videoRef.current.play().catch(err => {
//                         console.error('Video play error:', err);
//                         clearTimeout(timeout);
//                         reject(err);
//                     });
//                 }
//             } else {
//                 clearTimeout(timeout);
//                 reject(new Error('Video element not found'));
//             }
//         });
//     };

//     useEffect(() => {
//         isMounted.current = true;

//         // Initialize session ID
//         let sessionId = localStorage.getItem('session_id');
//         if (!sessionId) {
//             sessionId = uuidv4();
//             localStorage.setItem('session_id', sessionId);
//         }
//         sessionIdRef.current = sessionId;

//         // Load chat history from localStorage
//         const savedHistory = localStorage.getItem(`chat_history_${sessionId}`);
//         if (savedHistory) {
//             const history = JSON.parse(savedHistory);
//             setChatHistory(history);
//             setResponses(history);
//         }

//         // Start stream
//         async function startStream() {
//             if (!isMounted.current) return;
//             try {
//                 const res = await fetch('/api/start-stream', {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({ mode }),
//                 });
//                 if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
//                 const data = await res.json();
//                 if (data.error) {
//                     setStatus(`Failed to start stream: ${data.error}`);
//                 }
//             } catch (err) {
//                 setStatus(`Error starting stream: ${err.message}`);
//                 console.error('Start stream error:', err);
//             }
//         }

//         // Initialize video stream
//         async function initializeStream() {
//             if (!isMounted.current || hasInitializedStream.current) {
//                 console.log('Stream already initialized or component unmounted, skipping.');
//                 return;
//             }
//             hasInitializedStream.current = true;
//             try {
//                 if (streamRef.current) {
//                     streamRef.current.getTracks().forEach((track) => track.stop());
//                     streamRef.current = null;
//                 }
//                 let stream;
//                 if (mode === 'desktop') {
//                     const constraints = {
//                         video: {
//                             displaySurface: 'monitor',
//                             logicalSurface: false,
//                             monitorTypeSurfaces: 'include',
//                             width: { ideal: 1280 },
//                             height: { ideal: 720 },
//                             frameRate: { ideal: 15 },
//                         },
//                         audio: {
//                             echoCancellation: true,
//                             noiseSuppression: true,
//                             autoGainControl: true,
//                             sampleRate: 44100,
//                             channelCount: 1,
//                         },
//                     };
//                     stream = await navigator.mediaDevices.getDisplayMedia(constraints);
//                     console.log('Audio track settings:', stream.getAudioTracks()[0]?.getSettings());
//                 } else if (mode === 'camera') {
//                     stream = await navigator.mediaDevices.getUserMedia({
//                         video: true,
//                         audio: {
//                             sampleRate: 16000,
//                             echoCancellation: true,
//                             noiseSuppression: true,
//                             autoGainControl: false,
//                         },
//                     })
//                     console.log('Audio track settings:', stream.getAudioTracks()[0]?.getSettings());
//                 }
//                 streamRef.current = stream;
//                 if (videoRef.current) {
//                     videoRef.current.srcObject = stream;
//                     videoRef.current.muted = true;
//                     videoRef.current.volume = 0;
//                     await videoRef.current.play();
//                 } else {
//                     throw new Error('Video element not found');
//                 }
//                 await waitForVideo();
//                 canvasRef.current = document.createElement('canvas');
//                 setStatus('Stream initialized successfully');
//             } catch (err) {
//                 console.error(`${mode} access error:`, err);
//                 hasInitializedStream.current = false;
//                 setStatus(`Failed to access ${mode}: ${err.message}`);
//             }
//         }

//         // Run initialization after DOM is ready
//         const timer = setTimeout(() => {
//             if (isMounted.current) {
//                 startStream();
//                 initializeStream();
//             }
//         }, 100);

//         // Speech recognition setup
//         const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//         if (SpeechRecognition) {
//             recognitionRef.current = new SpeechRecognition();
//             recognitionRef.current.continuous = false;
//             recognitionRef.current.interimResults = false;
//             recognitionRef.current.lang = 'en-US';
//             recognitionRef.current.onstart = () => {
//                 if (isMounted.current) {
//                     setIsRecognitionRunning(true);
//                     setStatus('Listening for speech...');
//                 }
//             };
//             recognitionRef.current.onresult = async (event) => {
//                 if (isProcessing || !isMounted.current) return;
//                 setIsProcessing(true);
//                 const startTime = Date.now();
//                 const prompt = event.results[event.results.length - 1][0].transcript.trim();
//                 console.log('Recognized prompt:', prompt, `Time: ${Date.now() - startTime}ms`);
//                 if (!prompt) {
//                     setStatus('Empty prompt detected.');
//                     setIsProcessing(false);
//                     if (isMounted.current) {
//                         setTimeout(() => startRecognition(), 500);
//                     }
//                     return;
//                 }
//                 setStatus(`Processing: ${prompt}`);
//                 let imageData = null;
//                 try {
//                     await waitForVideo();
//                     const context = canvasRef.current.getContext('2d');
//                     canvasRef.current.width = Math.min(videoRef.current?.videoWidth || 640, 640);
//                     canvasRef.current.height = Math.min(videoRef.current?.videoHeight || 360, 360);
//                     context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
//                     imageData = canvasRef.current.toDataURL('image/jpeg', 0.2);
//                 } catch (err) {
//                     console.error('Frame capture error:', err);
//                 }
//                 if (!imageData) {
//                     setStatus('Failed to capture frame.');
//                     setIsProcessing(false);
//                     if (isMounted.current) {
//                         setTimeout(() => startRecognition(), 500);
//                     }
//                     return;
//                 }
//                 try {
//                     const apiStartTime = Date.now();
//                     const res = await fetch('/api/process-audio', {
//                         method: 'POST',
//                         headers: { 'Content-Type': 'application/json' },
//                         body: JSON.stringify({
//                             prompt,
//                             mode,
//                             image: imageData,
//                             session_id: sessionIdRef.current,
//                             chat_history: chatHistory,
//                         }),
//                     });
//                     console.log('API response time:', `${Date.now() - apiStartTime}ms`);
//                     if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
//                     const data = await res.json();
//                     if (data.error) {
//                         setStatus(data.error);
//                         if (isMounted.current) {
//                             setTimeout(() => startRecognition(), 1000);
//                         }
//                     } else {
//                         const newHistory = [...chatHistory, { prompt, response: data.response }].slice(-10);
//                         setChatHistory(newHistory);
//                         setResponses(newHistory);
//                         localStorage.setItem(`chat_history_${sessionIdRef.current}`, JSON.stringify(newHistory));
//                         setStatus('');
//                         setTimeout(() => {
//                             const utterance = new SpeechSynthesisUtterance(data.response);
//                             utterance.lang = 'en-US';
//                             utterance.volume = 0.7;
//                             utterance.rate = 1.1;
//                             utterance.pitch = 1.0;
//                             utterance.onend = () => {
//                                 if (isMounted.current) {
//                                     setTimeout(() => startRecognition(), 1000);
//                                 }
//                             };
//                             window.speechSynthesis.speak(utterance);
//                         }, 100);
//                     }
//                 } catch (err) {
//                     setStatus(`Error processing audio: ${err.message}`);
//                     if (isMounted.current) {
//                         setTimeout(() => startRecognition(), 1000);
//                     }
//                 }
//                 setIsProcessing(false);
//             };
//             recognitionRef.current.onerror = (event) => {
//                 if (isMounted.current) {
//                     setStatus(`Speech recognition error: ${event.error}`);
//                     setIsRecognitionRunning(false);
//                     setTimeout(() => startRecognition(), 1000);
//                 }
//             };
//             recognitionRef.current.onend = () => {
//                 if (isMounted.current) {
//                     setIsRecognitionRunning(false);
//                     if (mode && !isProcessing && !isRecognitionScheduled.current) {
//                         isRecognitionScheduled.current = true;
//                         setTimeout(() => {
//                             isRecognitionScheduled.current = false;
//                             startRecognition();
//                         }, 1000);
//                     }
//                 }
//             };
//             checkMicrophonePermission();
//             setTimeout(() => startRecognition(), 1000);
//         } else {
//             setStatus('Speech recognition not supported. Use Chrome or Edge.');
//         }

//         return () => {
//             isMounted.current = false;
//             clearTimeout(timer);
//             hasInitializedStream.current = false;
//             if (recognitionRef.current) recognitionRef.current.stop();
//             if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
//             window.speechSynthesis.cancel();
//             canvasRef.current = null;
//         };
//     }, [mode]); // Removed chatHistory from dependencies

//     function checkMicrophonePermission() {
//         navigator.permissions.query({ name: 'microphone' })
//             .then((permissionStatus) => {
//                 if (permissionStatus.state === 'denied') {
//                     setStatus('Microphone access denied. Please allow microphone in browser settings.');
//                 }
//             })
//             .catch((err) => {
//                 console.error('Permission query error:', err);
//             });
//     }

//     function startRecognition() {
//         if (recognitionRef.current && !isRecognitionRunning && !isProcessing && isMounted.current && !isRecognitionScheduled.current) {
//             try {
//                 recognitionRef.current.start();
//                 setIsRecognitionRunning(true);
//                 setStatus('Speech recognition started.');
//             } catch (e) {
//                 setStatus(`Failed to start recognition: ${e.message}`);
//             }
//         }
//     }

//     async function stopStream() {
//         window.speechSynthesis.cancel();
//         if (recognitionRef.current) {
//             recognitionRef.current.stop();
//             setIsRecognitionRunning(false);
//         }
//         if (streamRef.current) {
//             streamRef.current.getTracks().forEach((track) => track.stop());
//             streamRef.current = null;
//         }
//         try {
//             const res = await fetch('/api/stop-stream', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ mode, session_id: sessionIdRef.current }),
//             });
//             if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
//             const data = await res.json();
//             if (data.redirect) {
//                 localStorage.removeItem('session_id');
//                 localStorage.removeItem(`chat_history_${sessionIdRef.current}`);
//                 setResponses([]);
//                 setChatHistory([]);
//                 router.push(data.redirect);
//             }
//         } catch (err) {
//             setStatus(`Error stopping stream: ${err.message}`);
//         }
//     }

//     return (
//         <div className="w-full max-w-4xl p-6 rounded-lg shadow-lg bg-gray-800 bg-opacity-50">
//             <h1 className="text-3xl font-bold mb-4 text-center">
//                 AI Assistant - {mode?.charAt(0).toUpperCase() + mode?.slice(1)} Mode
//             </h1>
//             <div className="mb-6">
//                 <video
//                     id="videoFeed"
//                     ref={videoRef}
//                     autoPlay
//                     playsInline
//                     muted
//                     className="w-full max-h-96 object-contain rounded-lg"
//                 />
//             </div>
//             <div id="chatArea" className="h-64 overflow-y-auto p-4 bg-gray-900 bg-opacity-70 rounded-lg mb-4">
//                 {responses.map((item, index) => (
//                     <div key={index} className="mb-2">
//                         <p className="font-semibold text-purple-300">You: {item.prompt}</p>
//                         <p className="text-gray-200">AI: {item.response}</p>
//                     </div>
//                 ))}
//             </div>
//             <div className="flex justify-center space-x-4">
//                 <button
//                     id="stopButton"
//                     onClick={stopStream}
//                     className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300"
//                 >
//                     Stop and Return
//                 </button>
//                 <button
//                     onClick={startRecognition}
//                     className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
//                 >
//                     Restart Speech
//                 </button>
//             </div>
//             <div id="status" className="mt-4 text-center">{status}</div>
//         </div>
//     );
// }


'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function Chat() {
    const [responses, setResponses] = useState([]);
    const [status, setStatus] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRecognitionRunning, setIsRecognitionRunning] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [isMobile, setIsMobile] = useState(false);
    const [hasPermissions, setHasPermissions] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const recognitionRef = useRef(null);
    const streamRef = useRef(null);
    const isMounted = useRef(false);
    const hasInitializedStream = useRef(false);
    const isRecognitionScheduled = useRef(false);
    const recognitionTimeoutRef = useRef(null);
    const isInitializing = useRef(false);

    const router = useRouter();
    const { mode } = useParams();
    const sessionIdRef = useRef(null);

    // Detect mobile devices
    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            ) || window.innerWidth <= 768 || 'ontouchstart' in window;
            setIsMobile(isMobileDevice);
            if (isMobileDevice && mode === 'desktop') {
                setStatus('Desktop mode not supported on mobile. Switching to camera mode...');
                setTimeout(() => router.push('/chat/camera'), 2000);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [mode, router]);

    // Wait for video to be ready
    const waitForVideo = () => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.error('Video load timeout');
                reject(new Error('Video load timeout'));
            }, 10000);
            const checkVideo = () => {
                if (!videoRef.current) {
                    clearTimeout(timeout);
                    reject(new Error('Video element not found'));
                    return;
                }
                if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
                    clearTimeout(timeout);
                    resolve();
                }
            };
            if (videoRef.current) {
                videoRef.current.onloadedmetadata = checkVideo;
                videoRef.current.oncanplay = checkVideo;
                videoRef.current.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Video load error'));
                };
                checkVideo();
                if (videoRef.current.paused) {
                    videoRef.current.play().catch((err) => {
                        console.error('Video play error:', err);
                        clearTimeout(timeout);
                        reject(err);
                    });
                }
            } else {
                clearTimeout(timeout);
                reject(new Error('Video element not found'));
            }
        });
    };

    // Request permissions with retries
    const requestPermissions = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                setStatus(`Requesting permissions (attempt ${i + 1}/${retries})...`);
                console.log('Requesting microphone permission...');
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('Microphone stream:', audioStream.getAudioTracks());
                audioStream.getTracks().forEach((track) => track.stop());
                if (mode === 'camera') {
                    console.log('Requesting camera permission...');
                    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    console.log('Camera stream:', videoStream.getVideoTracks());
                    videoStream.getTracks().forEach((track) => track.stop());
                }
                console.log('Permissions granted successfully');
                return true;
            } catch (err) {
                console.error(`Permission error (attempt ${i + 1}/${retries}):`, err);
                if (i === retries - 1) {
                    if (err.name === 'NotAllowedError') {
                        setStatus('Permissions denied. Please allow microphone and camera in browser settings.');
                    } else if (err.name === 'NotFoundError') {
                        setStatus('No microphone or camera found. Ensure devices are connected.');
                    } else {
                        setStatus(`Permission error: ${err.message}`);
                    }
                    console.error('Final permission request failed:', err);
                    return false;
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
        console.error('All permission request retries failed.');
        return false;
    };

    // Main initialization
    useEffect(() => {
        isMounted.current = true;

        // Initialize session ID
        let sessionId = localStorage.getItem('session_id');
        if (!sessionId) {
            sessionId = uuidv4();
            localStorage.setItem('session_id', sessionId);
        }
        sessionIdRef.current = sessionId;

        // Load chat history
        const savedHistory = localStorage.getItem(`chat_history_${sessionId}`);
        if (savedHistory) {
            const history = JSON.parse(savedHistory);
            setChatHistory(history);
            setResponses(history);
        }

        const initializeApp = async () => {
            if (isInitializing.current) {
                console.log('Initialization already in progress, skipping...');
                return;
            }
            isInitializing.current = true;

            console.log('Initializing app for mode:', mode);
            const permissionsGranted = await requestPermissions();
            if (!permissionsGranted) {
                console.log('Permissions not granted, stopping initialization.');
                isInitializing.current = false;
                return;
            }

            setHasPermissions(true);
            await startStream();
            await initializeStream();
            setupSpeechRecognition();

            isInitializing.current = false;
        };

        if (isMounted.current) initializeApp();

        return () => {
            isMounted.current = false;
            clearTimeout(recognitionTimeoutRef.current);
            hasInitializedStream.current = false;
            isInitializing.current = false;
            if (recognitionRef.current) recognitionRef.current.stop();
            if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
            window.speechSynthesis.cancel();
            canvasRef.current = null;
        };
    }, [mode]);

    async function startStream() {
        if (!isMounted.current) return;
        try {
            const res = await fetch('/api/start-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode }),
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            if (data.error) setStatus(`Failed to start stream: ${data.error}`);
        } catch (err) {
            setStatus(`Error starting stream: ${err.message}`);
            console.error('Start stream error:', err);
        }
    }

    async function initializeStream() {
        if (!isMounted.current || hasInitializedStream.current) {
            console.log('Skipping stream initialization: already initialized or unmounted.');
            return;
        }
        hasInitializedStream.current = true;

        try {
            console.log('Starting stream initialization for mode:', mode);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }

            let stream;
            if (mode === 'desktop' && !isMobile) {
                const constraints = {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 10 },
                    },
                };
                console.log('Requesting screen share with constraints:', constraints);
                stream = await navigator.mediaDevices.getDisplayMedia(constraints);
                console.log('Requesting microphone for desktop mode...');
                const audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 44100,
                        channelCount: 1,
                    },
                });
                audioStream.getAudioTracks().forEach((track) => stream.addTrack(track));
            } else {
                const constraints = {
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                    audio: {
                        sampleRate: isMobile ? 16000 : 44100,
                    },
                };
                console.log('Requesting camera stream with constraints:', constraints);
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                } catch (err) {
                    console.error('Initial stream failed:', err);
                    console.log('Trying fallback constraints');
                    const fallbackConstraints = {
                        video: { width: 640, height: 480 },
                        audio: { sampleRate: 16000 },
                    };
                    stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                }
            }

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.muted = true;
                videoRef.current.volume = 0;
                videoRef.current.playsInline = true;
                try {
                    await videoRef.current.play();
                } catch (err) {
                    console.error('Video play error:', err);
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    await videoRef.current.play();
                }
            } else {
                throw new Error('Video element not found');
            }

            await waitForVideo();
            canvasRef.current = document.createElement('canvas');
            setStatus('Stream initialized successfully');
        } catch (err) {
            console.error(`${mode} access error:`, err);
            hasInitializedStream.current = false;
            setStatus(`Failed to access ${mode}: ${err.message}`);
        }
    }

    function setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setStatus('Speech recognition not supported. Use Chrome, Edge, or Safari.');
            console.error('SpeechRecognition API not available');
            return;
        }

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = isMobile;
        recognitionRef.current.lang = navigator.language || 'en-US';
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onstart = () => {
            if (isMounted.current) {
                console.log('Speech recognition started');
                setIsRecognitionRunning(true);
                setStatus('🎤 Listening for speech...');
                recognitionTimeoutRef.current = setTimeout(() => {
                    console.log('Speech recognition timeout, restarting...');
                    recognitionRef.current?.stop();
                }, 7000);
            }
        };

        recognitionRef.current.onresult = async (event) => {
            clearTimeout(recognitionTimeoutRef.current);
            if (isProcessing || !isMounted.current) return;
            setIsProcessing(true);

            const result = event.results[event.results.length - 1];
            if (!result.isFinal && !isMobile) return;
            const prompt = result[0].transcript.trim();
            console.log('Recognized prompt:', prompt);
            if (!prompt) {
                setStatus('Empty prompt detected.');
                setIsProcessing(false);
                if (isMounted.current) setTimeout(() => startRecognition(), 1000);
                return;
            }

            setStatus(`Processing: ${prompt}`);
            let imageData = null;
            try {
                await waitForVideo();
                const context = canvasRef.current.getContext('2d');
                canvasRef.current.width = Math.min(videoRef.current?.videoWidth || 640, 640);
                canvasRef.current.height = Math.min(videoRef.current?.videoHeight || 360, 360);
                context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                imageData = canvasRef.current.toDataURL('image/jpeg', isMobile ? 0.3 : 0.6);
            } catch (err) {
                console.error('Frame capture error:', err);
            }

            if (!imageData || imageData.length < 5000) {
                setStatus('Failed to capture valid frame.');
                setIsProcessing(false);
                if (isMounted.current) setTimeout(() => startRecognition(), 1000);
                return;
            }

            try {
                const maxRetries = 3;
                let retries = 0;
                let data;
                while (retries < maxRetries) {
                    try {
                        const res = await fetch('/api/process-audio', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                prompt,
                                mode: isMobile && mode === 'desktop' ? 'camera' : mode,
                                image: imageData,
                                session_id: sessionIdRef.current,
                                chat_history: chatHistory,
                            }),
                        });
                        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                        data = await res.json();
                        break;
                    } catch (err) {
                        retries++;
                        console.error(`API retry ${retries}/${maxRetries}:`, err);
                        if (retries === maxRetries) throw err;
                        await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
                    }
                }

                if (data.error) {
                    setStatus(data.error);
                    if (isMounted.current) setTimeout(() => startRecognition(), 1000);
                } else {
                    const newHistory = [...chatHistory, { prompt, response: data.response }].slice(-10);
                    setChatHistory(newHistory);
                    setResponses(newHistory);
                    localStorage.setItem(`chat_history_${sessionIdRef.current}`, JSON.stringify(newHistory));
                    setStatus('');
                    setTimeout(() => {
                        const utterance = new SpeechSynthesisUtterance(data.response);
                        utterance.lang = 'en-US';
                        utterance.volume = 0.8;
                        utterance.rate = 1.0;
                        utterance.pitch = 1.0;
                        utterance.onend = () => {
                            if (isMounted.current) {
                                setTimeout(() => startRecognition(), 1000);
                            }
                        };
                        utterance.onerror = (e) => {
                            console.error('Speech synthesis error:', e);
                            if (isMounted.current) setTimeout(() => startRecognition(), 1000);
                        };
                        window.speechSynthesis.speak(utterance);
                    }, 200);
                }
            } catch (err) {
                console.error('API processing error:', err);
                setStatus(`Error processing audio: ${err.message}`);
                if (isMounted.current) setTimeout(() => startRecognition(), 1000);
            }
            setIsProcessing(false);
        };

        recognitionRef.current.onerror = (event) => {
            clearTimeout(recognitionTimeoutRef.current);
            if (isMounted.current) {
                console.error('Speech recognition error:', event.error, event.message);
                setStatus(`Speech recognition error: ${event.error}`);
                setIsRecognitionRunning(false);
                if (event.error === 'not-allowed') {
                    setStatus('Microphone access denied. Please allow microphone access.');
                    setHasPermissions(false);
                } else if (event.error === 'network') {
                    setStatus('Network error. Check your internet connection.');
                } else {
                    setTimeout(() => startRecognition(), 2000);
                }
            }
        };

        recognitionRef.current.onend = () => {
            clearTimeout(recognitionTimeoutRef.current);
            if (isMounted.current) {
                console.log('Speech recognition ended');
                setIsRecognitionRunning(false);
                if (mode && !isProcessing && !isRecognitionScheduled.current && hasPermissions) {
                    isRecognitionScheduled.current = true;
                    setTimeout(() => {
                        isRecognitionScheduled.current = false;
                        startRecognition();
                    }, 1000);
                }
            }
        };

        startRecognition();
    }

    function startRecognition() {
        if (!recognitionRef.current || isRecognitionRunning || isProcessing || !isMounted.current || !hasPermissions) {
            console.log('Cannot start recognition:', {
                hasRecognition: !!recognitionRef.current,
                isRecognitionRunning,
                isProcessing,
                isMounted: isMounted.current,
                hasPermissions,
            });
            return;
        }
        try {
            console.log('Starting speech recognition...');
            recognitionRef.current.start();
            setIsRecognitionRunning(true);
            setStatus('🎤 Listening for speech...');
        } catch (e) {
            console.error('Recognition start error:', e);
            setStatus(`Failed to start recognition: ${e.message}`);
            setIsRecognitionRunning(false);
            setTimeout(() => startRecognition(), 2000);
        }
    }

    async function stopStream() {
        window.speechSynthesis.cancel();
        clearTimeout(recognitionTimeoutRef.current);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecognitionRunning(false);
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        try {
            const res = await fetch('/api/stop-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, session_id: sessionIdRef.current }),
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            if (data.redirect) {
                localStorage.removeItem('session_id');
                localStorage.removeItem(`chat_history_${sessionIdRef.current}`);
                setResponses([]);
                setChatHistory([]);
                router.push(data.redirect);
            }
        } catch (err) {
            setStatus(`Error stopping stream: ${err.message}`);
        }
    }

    const handlePermissionRequest = async () => {
        const granted = await requestPermissions();
        if (granted) {
            setHasPermissions(true);
            await initializeStream();
            setupSpeechRecognition();
        }
    };

    return (
        <div className="w-full max-w-4xl p-6 rounded-lg shadow-lg bg-gray-800 bg-opacity-50">
            <h1 className="text-3xl font-bold mb-4 text-center">
                AI Assistant - {mode?.charAt(0).toUpperCase() + mode?.slice(1)} Mode
                {isMobile && <span className="text-sm block text-gray-400">(Mobile Optimized)</span>}
            </h1>
            {!hasPermissions && (
                <div className="mb-6 p-4 bg-yellow-600 bg-opacity-70 rounded-lg text-center">
                    <p className="mb-2">
                        {mode === 'camera' ? 'Microphone and camera access required' : 'Microphone access required'}
                    </p>
                    <button
                        onClick={handlePermissionRequest}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Grant Permissions
                    </button>
                </div>
            )}
            {mode === 'camera' && hasPermissions && !isRecognitionRunning && !status && (
                <div className="mb-6 p-4 bg-blue-600 bg-opacity-70 rounded-lg text-center">
                    <p>Initializing camera stream...</p>
                </div>
            )}
            <div className="mb-6">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-96 object-contain rounded-lg"
                    style={{ transform: isMobile && mode === 'camera' ? 'scaleX(-1)' : 'none' }}
                />
            </div>
            <div className="h-64 overflow-y-auto p-4 bg-gray-900 bg-opacity-70 rounded-lg mb-4">
                {responses.map((item, index) => (
                    <div key={index} className="mb-2">
                        <p className="font-semibold text-purple-300">You: {item.prompt}</p>
                        <p className="text-gray-200">AI: {item.response}</p>
                    </div>
                ))}
            </div>
            <div className="flex justify-center space-x-4 flex-wrap">
                <button
                    onClick={stopStream}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300 mb-2"
                >
                    Stop and Return
                </button>
                <button
                    onClick={startRecognition}
                    disabled={!hasPermissions}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition duration-300 mb-2"
                >
                    {isRecognitionRunning ? 'Listening...' : 'Start Speech'}
                </button>
                {isMobile && (
                    <button
                        onClick={handlePermissionRequest}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-300 mb-2"
                    >
                        Refresh Permissions
                    </button>
                )}
            </div>
            <div className="mt-4 text-center">
                <div
                    className={`inline-block px-3 py-1 rounded-full text-sm ${isRecognitionRunning
                            ? 'bg-green-600'
                            : isProcessing
                                ? 'bg-yellow-600'
                                : hasPermissions
                                    ? 'bg-blue-600'
                                    : 'bg-red-600'
                        }`}
                >
                    {status || (hasPermissions ? 'Ready' : 'Waiting for permissions')}
                </div>
            </div>
            {isProcessing && (
                <div className="text-center mt-2">
                    Processing... <span className="animate-spin">⏳</span>
                </div>
            )}
        </div>
    );
}