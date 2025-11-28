import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, Play, FileAudio, Terminal, Settings, Download, StopCircle, Cpu, Globe, Type, Activity } from 'lucide-react';
import { LANGUAGES, MODELS, TASKS, OUTPUT_FORMATS } from './constants';
import ProcessingModal from './components/ProcessingModal';
import RecordingModal from './components/RecordingModal';

function App() {
  const [file, setFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [config, setConfig] = useState({
    model: 'base',
    language: 'auto',
    task: 'transcribe',
    output_format: 'txt',
    temperature: 0,
    beam_size: 5
  });

  const [status, setStatus] = useState('idle'); // idle, processing, success, error
  const [output, setOutput] = useState('');
  const [logs, setLogs] = useState('');
  const [generatedFilename, setGeneratedFilename] = useState(null);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setLogs(prev => prev + `\n> File loaded: ${e.target.files[0].name}`);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], "recording.wav", { type: 'audio/wav' });
        setFile(audioFile);
        setLogs(prev => prev + `\n> Recording finished. Size: ${audioBlob.size} bytes`);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAudioStream(stream);
      setLogs(prev => prev + `\n> Recording started...`);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setLogs(prev => prev + `\n> Error: Could not access microphone.`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioStream(null);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      alert("Please select a file or record audio first.");
      return;
    }

    setStatus('processing');
    setElapsedTime(0);
    setLogs(prev => prev + `\n> Initiating transcription sequence...`);
    setLogs(prev => prev + `\n> Model: ${config.model} | Language: ${config.language}`);

    const formData = new FormData();
    formData.append('file', file);
    Object.keys(config).forEach(key => {
      formData.append(key, config[key]);
    });

    try {
      // Start transcription
      const response = await fetch('http://127.0.0.1:8000/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'started') {
        setCurrentTaskId(data.task_id);
        setLogs(prev => prev + `\n> Task started: ${data.task_id}`);

        // Start elapsed time counter
        const startTime = Date.now();
        const timeInterval = setInterval(() => {
          setElapsedTime((Date.now() - startTime) / 1000);
        }, 100);

        // Poll for status
        pollingIntervalRef.current = setInterval(async () => {
          try {
            const statusResponse = await fetch(`http://127.0.0.1:8000/status/${data.task_id}`);
            const statusData = await statusResponse.json();

            if (statusData.status === 'complete') {
              clearInterval(pollingIntervalRef.current);
              clearInterval(timeInterval);
              setOutput(statusData.output);
              setGeneratedFilename(statusData.filename);
              setStatus('success');
              const totalTime = Math.floor(statusData.elapsed_time || elapsedTime);
              setLogs(prev => prev + `\n> Process completed successfully in ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`);
              setCurrentTaskId(null);
            } else if (statusData.status === 'error') {
              clearInterval(pollingIntervalRef.current);
              clearInterval(timeInterval);
              setStatus('error');
              setLogs(prev => prev + `\n> Error: ${statusData.error}`);
              if (statusData.logs) setLogs(prev => prev + `\n${statusData.logs}`);
              setCurrentTaskId(null);
            }
          } catch (pollError) {
            console.error('Polling error:', pollError);
          }
        }, 2000);
      } else {
        setStatus('error');
        setLogs(prev => prev + `\n> Error: Failed to start transcription`);
      }
    } catch (error) {
      setStatus('error');
      setLogs(prev => prev + `\n> Network Error: ${error.message}`);
    }
  };

  const handleCancel = async () => {
    if (!currentTaskId) return;

    try {
      await fetch(`http://127.0.0.1:8000/cancel/${currentTaskId}`, {
        method: 'POST',
      });

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      setStatus('idle');
      setCurrentTaskId(null);
      setElapsedTime(0);
      setLogs(prev => prev + `\n> Transcription cancelled by user`);
    } catch (error) {
      console.error('Cancel error:', error);
      setLogs(prev => prev + `\n> Error cancelling: ${error.message}`);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (!generatedFilename) return;
    const downloadUrl = `http://127.0.0.1:8000/download/${generatedFilename}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = generatedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadRecording = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name || 'recording.wav';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen text-gray-100 p-4 md:p-8 font-sans selection:bg-neon-blue selection:text-black overflow-x-hidden">
      {/* Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-purple tracking-tighter">
            WHISPER <span className="text-white font-light">UI</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm tracking-widest uppercase">Advanced Audio Intelligence Interface</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-neon-blue border border-neon-blue/30 px-4 py-2 rounded-full bg-neon-blue/5">
          <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse"></div>
          SYSTEM ONLINE
        </div>
      </header>

      {/* Modals */}
      <RecordingModal
        isVisible={isRecording}
        stream={audioStream}
        onStop={stopRecording}
        recordingTime={recordingTime}
      />
      <ProcessingModal
        isVisible={status === 'processing'}
        onCancel={handleCancel}
        elapsedTime={elapsedTime}
      />

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input & Output */}
        <div className="lg:col-span-7 space-y-6">
          {/* Input Card */}
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue to-neon-purple opacity-50"></div>

            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FileAudio className="text-neon-blue" /> Audio Source
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Upload */}
              <div className="relative group/upload">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="audio/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-300 ${file && !isRecording ? 'border-neon-green bg-neon-green/5' : 'border-gray-700 hover:border-neon-blue hover:bg-white/5'}`}>
                  <Upload className={`w-8 h-8 mb-3 ${file ? 'text-neon-green' : 'text-gray-400 group-hover/upload:text-neon-blue'}`} />
                  <span className="text-sm font-medium text-gray-300">
                    {file ? file.name : "Drop audio file or Click"}
                  </span>
                </div>
              </div>

              {/* Recording */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-300 border-2 ${isRecording ? 'border-red-500 bg-red-500/10' : 'border-gray-700 hover:border-red-500 hover:bg-white/5'}`}
              >
                {isRecording ? (
                  <>
                    <StopCircle className="w-8 h-8 mb-3 text-red-500 animate-pulse" />
                    <span className="text-sm font-medium text-red-400">Stop Recording ({formatTime(recordingTime)})</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-8 h-8 mb-3 text-gray-400 group-hover:text-red-500" />
                    <span className="text-sm font-medium text-gray-300">Record Microphone</span>
                  </>
                )}
              </button>
            </div>

            {/* Download Recording Button */}
            {file && file.name && file.name.includes('recording') && (
              <button
                onClick={handleDownloadRecording}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-neon-green/10 border border-neon-green/30 rounded-lg text-neon-green text-sm font-medium hover:bg-neon-green/20 transition-all"
              >
                <Download size={16} /> Download Recording
              </button>
            )}
          </div>

          {/* Output Console */}
          <div className="glass-panel rounded-2xl p-6 min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Terminal className="text-neon-purple" /> Transcription Output
              </h2>
              <button
                onClick={handleDownload}
                disabled={!generatedFilename}
                className="flex items-center gap-2 px-4 py-2 bg-neon-blue/10 border border-neon-blue/30 rounded-lg text-neon-blue text-sm font-medium hover:bg-neon-blue/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Download size={16} /> Download
              </button>
            </div>

            <div className="flex-1 h-full max-h-[500px] bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-y-auto border border-gray-800 relative">

              {output ? (
                <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">{output}</pre>
              ) : (
                <div className="text-gray-600 italic">Waiting for input...</div>
              )}
            </div>

            {/* Logs Mini-Console */}
            <div className="mt-4 h-32 bg-black rounded border border-gray-800 p-2 font-mono text-xs text-green-500 overflow-y-auto">
              <div className="opacity-50 mb-1">--- SYSTEM LOGS ---</div>
              <pre className="whitespace-pre-wrap">{logs}</pre>
            </div>
          </div>
        </div>

        {/* Right Column: Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Settings className="text-neon-blue" /> Configuration
            </h2>

            <div className="space-y-5">
              {/* Model Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Cpu size={14} /> Model Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {MODELS.map(m => (
                    <button
                      key={m}
                      onClick={() => setConfig({ ...config, model: m })}
                      className={`px-3 py-2 rounded text-sm font-medium transition-all ${config.model === m ? 'bg-neon-blue text-black shadow-[0_0_10px_rgba(0,243,255,0.3)]' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Globe size={14} /> Language
                </label>
                <select
                  value={config.language}
                  onChange={(e) => setConfig({ ...config, language: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-neon-blue focus:outline-none transition-colors"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Task & Format */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Activity size={14} /> Task
                  </label>
                  <select
                    value={config.task}
                    onChange={(e) => setConfig({ ...config, task: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-neon-blue focus:outline-none"
                  >
                    {TASKS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Type size={14} /> Format
                  </label>
                  <select
                    value={config.output_format}
                    onChange={(e) => setConfig({ ...config, output_format: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-neon-blue focus:outline-none"
                  >
                    {OUTPUT_FORMATS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Advanced sliders */}
              <div>
                <label className="flex justify-between text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  <span>Temperature</span>
                  <span className="text-neon-blue">{config.temperature}</span>
                </label>
                <input
                  type="range"
                  min="0" max="1" step="0.1"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-blue"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={status === 'processing' || (!file && !isRecording)}
                className="w-full mt-8 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(188,19,254,0.3)] hover:shadow-[0_0_30px_rgba(188,19,254,0.5)] transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play className="fill-current" /> EXECUTE WHISPER
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App;
