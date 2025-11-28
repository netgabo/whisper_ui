import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Activity, Terminal, Zap } from 'lucide-react';

const SYSTEM_LOGS = [
    "INITIALIZING_NEURAL_NET...",
    "LOADING_WEIGHTS [BASE_MODEL]...",
    "ALLOCATING_TENSORS [GPU_0]...",
    "OPTIMIZING_COMPUTE_GRAPH...",
    "AUDIO_PREPROCESSING_SEQUENCE_STARTED...",
    "FFT_TRANSFORM_COMPLETE...",
    "DETECTING_VOICE_ACTIVITY...",
    "BEAM_SEARCH_INITIALIZED [WIDTH=5]...",
    "DECODING_TOKENS...",
    "CONTEXT_WINDOW_ANALYSIS...",
    "APPLYING_ATTENTION_MASKS...",
    "PROBABILITY_DISTRIBUTION_CALC...",
    "TIMESTAMP_ALIGNMENT...",
    "TEXT_NORMALIZATION...",
    "GARBAGE_COLLECTION...",
    "FINALIZING_OUTPUT_BUFFER..."
];

const ProcessingModal = ({ isVisible, onCancel, elapsedTime = 0 }) => {
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState([]);
    const [cpuLoad, setCpuLoad] = useState([]);
    const [decodingText, setDecodingText] = useState("INITIALIZING");
    const logsEndRef = useRef(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isVisible) {
            setProgress(0);
            setLogs([]);
            setCpuLoad(new Array(20).fill(10));
        }
    }, [isVisible]);

    // Progress Simulation
    useEffect(() => {
        if (!isVisible) return;

        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return prev; // Stall at 95% until real completion
                return prev + (Math.random() * 2);
            });
        }, 200);
        return () => clearInterval(interval);
    }, [isVisible]);

    // CPU Visualizer Animation
    useEffect(() => {
        if (!isVisible) return;

        const interval = setInterval(() => {
            setCpuLoad(prev => prev.map(() => Math.floor(Math.random() * 80) + 20));
        }, 100);
        return () => clearInterval(interval);
    }, [isVisible]);

    // Logs Simulation
    useEffect(() => {
        if (!isVisible) return;

        let logIndex = 0;
        const interval = setInterval(() => {
            if (logIndex < SYSTEM_LOGS.length) {
                setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${SYSTEM_LOGS[logIndex]}`]);
                logIndex++;
            } else {
                // Random hex dumps after main logs
                const hex = Math.random().toString(16).substr(2, 8).toUpperCase();
                setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] MEM_DUMP: 0x${hex}`]);
            }
        }, 800);
        return () => clearInterval(interval);
    }, [isVisible]);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Decoding Text Effect
    useEffect(() => {
        if (!isVisible) return;

        const words = ["ANALYZING", "TRANSCRIBING", "PROCESSING", "DECODING", "SYNTHESIZING"];
        let wordIndex = 0;

        const interval = setInterval(() => {
            setDecodingText(words[wordIndex]);
            wordIndex = (wordIndex + 1) % words.length;
        }, 2000);

        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-2xl bg-black/90 border border-neon-blue/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,243,255,0.1)] relative overflow-hidden">

                {/* Background Grid Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

                <div className="relative z-10 space-y-8">

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-3 h-3 bg-neon-blue rounded-full animate-pulse"></div>
                                <div className="absolute inset-0 w-3 h-3 bg-neon-blue rounded-full animate-ping opacity-75"></div>
                            </div>
                            <h2 className="text-xl font-bold tracking-widest text-white">
                                SYSTEM PROCESSING
                            </h2>
                        </div>
                        <div className="font-mono text-neon-blue text-sm">
                            ELAPSED: {Math.floor(elapsedTime / 60)}:{(Math.floor(elapsedTime) % 60).toString().padStart(2, '0')}
                        </div>
                    </div>

                    {/* Main Visualizer Area */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* CPU/Neural Activity */}
                        <div className="bg-black/50 border border-gray-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3 text-xs text-gray-400 uppercase tracking-wider">
                                <Cpu size={14} className="text-neon-purple" /> Neural Core Activity
                            </div>
                            <div className="flex items-end justify-between h-24 gap-1">
                                {cpuLoad.map((height, i) => (
                                    <div
                                        key={i}
                                        className="w-full bg-gradient-to-t from-neon-purple/20 to-neon-purple transition-all duration-100"
                                        style={{ height: `${height}%` }}
                                    ></div>
                                ))}
                            </div>
                        </div>

                        {/* Decoding Status */}
                        <div className="bg-black/50 border border-gray-800 rounded-lg p-4 flex flex-col justify-center items-center text-center">
                            <Activity size={24} className="text-neon-green mb-2 animate-bounce" />
                            <div className="text-2xl font-bold text-white font-mono tracking-widest">
                                {decodingText}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                CONFIDENCE: {(90 + Math.random() * 9).toFixed(2)}%
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-mono text-neon-blue">
                            <span>COMPLETION</span>
                            <span>{Math.floor(progress)}%</span>
                        </div>
                        <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                            <div
                                className="h-full bg-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.5)] transition-all duration-200 ease-out relative"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_1s_infinite]"></div>
                            </div>
                        </div>
                    </div>

                    {/* System Logs */}
                    <div className="bg-black rounded-lg border border-gray-800 p-4 font-mono text-xs h-32 overflow-hidden relative">
                        <div className="absolute top-2 right-2 text-gray-600">
                            <Terminal size={14} />
                        </div>
                        <div className="space-y-1 h-full overflow-y-auto scrollbar-hide">
                            {logs.map((log, i) => (
                                <div key={i} className="text-green-500/80 truncate">
                                    <span className="text-gray-600 mr-2">{'>'}</span>
                                    {log}
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>

                    {/* Cancel Button */}
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="w-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-500 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            CANCEL TRANSCRIPTION
                        </button>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ProcessingModal;
