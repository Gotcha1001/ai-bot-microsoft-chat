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
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const recognitionRef = useRef(null);
    const streamRef = useRef(null);
    const isMounted = useRef(false);
    const hasInitializedStream = useRef(false);
    const isRecognitionScheduled = useRef(false); // Prevent overlapping recognition
    const router = useRouter();
    const { mode } = useParams();
    const sessionIdRef = useRef(null);

    const waitForVideo = () => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Video load timeout')), 15000);
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
                    videoRef.current.play().catch(err => {
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

    useEffect(() => {
        isMounted.current = true;

        // Initialize session ID
        let sessionId = localStorage.getItem('session_id');
        if (!sessionId) {
            sessionId = uuidv4();
            localStorage.setItem('session_id', sessionId);
        }
        sessionIdRef.current = sessionId;

        // Load chat history from localStorage
        const savedHistory = localStorage.getItem(`chat_history_${sessionId}`);
        if (savedHistory) {
            const history = JSON.parse(savedHistory);
            setChatHistory(history);
            setResponses(history);
        }

        // Start stream
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
                if (data.error) {
                    setStatus(`Failed to start stream: ${data.error}`);
                }
            } catch (err) {
                setStatus(`Error starting stream: ${err.message}`);
                console.error('Start stream error:', err);
            }
        }

        // Initialize video stream
        async function initializeStream() {
            if (!isMounted.current || hasInitializedStream.current) {
                console.log('Stream already initialized or component unmounted, skipping.');
                return;
            }
            hasInitializedStream.current = true;
            try {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((track) => track.stop());
                    streamRef.current = null;
                }
                let stream;
                if (mode === 'desktop') {
                    const constraints = {
                        video: {
                            displaySurface: 'monitor',
                            logicalSurface: false,
                            monitorTypeSurfaces: 'include',
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            frameRate: { ideal: 15 },
                        },
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                            sampleRate: 44100,
                            channelCount: 1,
                        },
                    };
                    stream = await navigator.mediaDevices.getDisplayMedia(constraints);
                    console.log('Audio track settings:', stream.getAudioTracks()[0]?.getSettings());
                } else if (mode === 'camera') {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: {
                            sampleRate: 16000,
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: false,
                        },
                    })
                    console.log('Audio track settings:', stream.getAudioTracks()[0]?.getSettings());
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.muted = true;
                    videoRef.current.volume = 0;
                    await videoRef.current.play();
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

        // Run initialization after DOM is ready
        const timer = setTimeout(() => {
            if (isMounted.current) {
                startStream();
                initializeStream();
            }
        }, 100);

        // Speech recognition setup
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';
            recognitionRef.current.onstart = () => {
                if (isMounted.current) {
                    setIsRecognitionRunning(true);
                    setStatus('Listening for speech...');
                }
            };
            recognitionRef.current.onresult = async (event) => {
                if (isProcessing || !isMounted.current) return;
                setIsProcessing(true);
                const startTime = Date.now();
                const prompt = event.results[event.results.length - 1][0].transcript.trim();
                console.log('Recognized prompt:', prompt, `Time: ${Date.now() - startTime}ms`);
                if (!prompt) {
                    setStatus('Empty prompt detected.');
                    setIsProcessing(false);
                    if (isMounted.current) {
                        setTimeout(() => startRecognition(), 500);
                    }
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
                    imageData = canvasRef.current.toDataURL('image/jpeg', 0.2);
                } catch (err) {
                    console.error('Frame capture error:', err);
                }
                if (!imageData) {
                    setStatus('Failed to capture frame.');
                    setIsProcessing(false);
                    if (isMounted.current) {
                        setTimeout(() => startRecognition(), 500);
                    }
                    return;
                }
                try {
                    const apiStartTime = Date.now();
                    const res = await fetch('/api/process-audio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt,
                            mode,
                            image: imageData,
                            session_id: sessionIdRef.current,
                            chat_history: chatHistory,
                        }),
                    });
                    console.log('API response time:', `${Date.now() - apiStartTime}ms`);
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    const data = await res.json();
                    if (data.error) {
                        setStatus(data.error);
                        if (isMounted.current) {
                            setTimeout(() => startRecognition(), 1000);
                        }
                    } else {
                        const newHistory = [...chatHistory, { prompt, response: data.response }].slice(-10);
                        setChatHistory(newHistory);
                        setResponses(newHistory);
                        localStorage.setItem(`chat_history_${sessionIdRef.current}`, JSON.stringify(newHistory));
                        setStatus('');
                        setTimeout(() => {
                            const utterance = new SpeechSynthesisUtterance(data.response);
                            utterance.lang = 'en-US';
                            utterance.volume = 0.7;
                            utterance.rate = 1.1;
                            utterance.pitch = 1.0;
                            utterance.onend = () => {
                                if (isMounted.current) {
                                    setTimeout(() => startRecognition(), 1000);
                                }
                            };
                            window.speechSynthesis.speak(utterance);
                        }, 100);
                    }
                } catch (err) {
                    setStatus(`Error processing audio: ${err.message}`);
                    if (isMounted.current) {
                        setTimeout(() => startRecognition(), 1000);
                    }
                }
                setIsProcessing(false);
            };
            recognitionRef.current.onerror = (event) => {
                if (isMounted.current) {
                    setStatus(`Speech recognition error: ${event.error}`);
                    setIsRecognitionRunning(false);
                    setTimeout(() => startRecognition(), 1000);
                }
            };
            recognitionRef.current.onend = () => {
                if (isMounted.current) {
                    setIsRecognitionRunning(false);
                    if (mode && !isProcessing && !isRecognitionScheduled.current) {
                        isRecognitionScheduled.current = true;
                        setTimeout(() => {
                            isRecognitionScheduled.current = false;
                            startRecognition();
                        }, 1000);
                    }
                }
            };
            checkMicrophonePermission();
            setTimeout(() => startRecognition(), 1000);
        } else {
            setStatus('Speech recognition not supported. Use Chrome or Edge.');
        }

        return () => {
            isMounted.current = false;
            clearTimeout(timer);
            hasInitializedStream.current = false;
            if (recognitionRef.current) recognitionRef.current.stop();
            if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
            window.speechSynthesis.cancel();
            canvasRef.current = null;
        };
    }, [mode]); // Removed chatHistory from dependencies

    function checkMicrophonePermission() {
        navigator.permissions.query({ name: 'microphone' })
            .then((permissionStatus) => {
                if (permissionStatus.state === 'denied') {
                    setStatus('Microphone access denied. Please allow microphone in browser settings.');
                }
            })
            .catch((err) => {
                console.error('Permission query error:', err);
            });
    }

    function startRecognition() {
        if (recognitionRef.current && !isRecognitionRunning && !isProcessing && isMounted.current && !isRecognitionScheduled.current) {
            try {
                recognitionRef.current.start();
                setIsRecognitionRunning(true);
                setStatus('Speech recognition started.');
            } catch (e) {
                setStatus(`Failed to start recognition: ${e.message}`);
            }
        }
    }

    async function stopStream() {
        window.speechSynthesis.cancel();
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

    return (
        <div className="w-full max-w-4xl p-6 rounded-lg shadow-lg bg-gray-800 bg-opacity-50">
            <h1 className="text-3xl font-bold mb-4 text-center">
                AI Assistant - {mode?.charAt(0).toUpperCase() + mode?.slice(1)} Mode
            </h1>
            <div className="mb-6">
                <video
                    id="videoFeed"
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-96 object-contain rounded-lg"
                />
            </div>
            <div id="chatArea" className="h-64 overflow-y-auto p-4 bg-gray-900 bg-opacity-70 rounded-lg mb-4">
                {responses.map((item, index) => (
                    <div key={index} className="mb-2">
                        <p className="font-semibold text-purple-300">You: {item.prompt}</p>
                        <p className="text-gray-200">AI: {item.response}</p>
                    </div>
                ))}
            </div>
            <div className="flex justify-center space-x-4">
                <button
                    id="stopButton"
                    onClick={stopStream}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300"
                >
                    Stop and Return
                </button>
                <button
                    onClick={startRecognition}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
                >
                    Restart Speech
                </button>
            </div>
            <div id="status" className="mt-4 text-center">{status}</div>
        </div>
    );
}