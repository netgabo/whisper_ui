import React, { useEffect, useRef } from 'react';
import { Mic, StopCircle } from 'lucide-react';

const RecordingModal = ({ isVisible, stream, onStop, recordingTime }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const analyserRef = useRef(null);
    const audioContextRef = useRef(null);

    useEffect(() => {
        if (!isVisible || !stream) {
            // Cleanup
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            return;
        }

        // Setup Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyserRef.current = analyser;
        analyser.fftSize = 256;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            // Clear canvas with fade effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, width, height);

            const barWidth = (width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * height * 0.8;

                // Gradient for bars
                const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
                gradient.addColorStop(0, '#00f3ff');
                gradient.addColorStop(0.5, '#bc13fe');
                gradient.addColorStop(1, '#0aff0a');

                ctx.fillStyle = gradient;
                ctx.fillRect(x, height - barHeight, barWidth, barHeight);

                // Add glow effect
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00f3ff';

                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [isVisible, stream]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="w-full max-w-3xl bg-black/95 border border-red-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(255,0,0,0.2)] relative overflow-hidden">

                {/* Animated border pulse */}
                <div className="absolute inset-0 border-2 border-red-500 rounded-2xl animate-pulse opacity-30"></div>

                <div className="relative z-10 space-y-6">

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Mic className="w-6 h-6 text-red-500 animate-pulse" />
                                <div className="absolute inset-0 w-6 h-6 bg-red-500 rounded-full animate-ping opacity-50"></div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-widest text-white">
                                    RECORDING IN PROGRESS
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">Speak clearly into your microphone</p>
                            </div>
                        </div>
                        <div className="font-mono text-red-500 text-2xl font-bold">
                            {formatTime(recordingTime)}
                        </div>
                    </div>

                    {/* Waveform Canvas */}
                    <div className="relative">
                        <canvas
                            ref={canvasRef}
                            width={800}
                            height={200}
                            className="w-full rounded-lg border border-gray-800 bg-black"
                        />
                        <div className="absolute top-2 left-2 text-xs text-gray-600 font-mono">
                            FREQUENCY SPECTRUM
                        </div>
                    </div>

                    {/* Audio Level Indicator */}
                    <div className="flex items-center gap-3">
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Input Level</div>
                        <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                            <div className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 w-3/4 animate-pulse"></div>
                        </div>
                    </div>

                    {/* Stop Button */}
                    <button
                        onClick={onStop}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(255,0,0,0.3)] hover:shadow-[0_0_30px_rgba(255,0,0,0.5)] transform hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                    >
                        <StopCircle className="fill-current" size={24} />
                        STOP RECORDING
                    </button>

                    {/* Info Text */}
                    <div className="text-center text-xs text-gray-500">
                        Press the button above or press ESC to stop recording
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecordingModal;
