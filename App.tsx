import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MicrophoneIcon, 
  StopIcon, 
  ClipboardDocumentIcon, 
  TrashIcon, 
  SparklesIcon,
  LanguageIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid';
import { polishBanglaText, translateToEnglish } from './services/geminiService';
import { AppStatus } from './types';

const App: React.FC = () => {
  const [transcript, setTranscript] = useState<string>('');
  const [aiOutput, setAiOutput] = useState<string>('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'ai'>('transcript');
  
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'bn-BD'; // Bengali (Bangladesh)

      recognition.onstart = () => {
        setStatus(AppStatus.LISTENING);
        setErrorMsg(null);
      };

      recognition.onend = () => {
        // Only set to IDLE if we didn't manually stop it (which sets it to IDLE immediately)
        // or if an error didn't occur. 
        // We handle logic inside toggleListening to keep state consistent.
        if (status === AppStatus.LISTENING) {
            setStatus(AppStatus.IDLE);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone permission denied.');
        } else if (event.error === 'no-speech') {
          // Ignore no-speech errors usually
        } else {
          setErrorMsg(`Error: ${event.error}`);
        }
        setStatus(AppStatus.ERROR);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current = recognition;
    } else {
      setErrorMsg("Your browser doesn't support Web Speech API.");
      setStatus(AppStatus.ERROR);
    }
  }, [status]);

  const toggleListening = useCallback(() => {
    if (status === AppStatus.LISTENING) {
      recognitionRef.current?.stop();
      setStatus(AppStatus.IDLE);
    } else {
      try {
        recognitionRef.current?.start();
        setStatus(AppStatus.LISTENING);
      } catch (err) {
        console.error("Failed to start recognition", err);
        setStatus(AppStatus.ERROR);
        setErrorMsg("Failed to start recording. Please refresh.");
      }
    }
  }, [status]);

  const handleCopy = useCallback((text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, []);

  const handleClear = useCallback(() => {
    setTranscript('');
    setAiOutput('');
    setErrorMsg(null);
    setStatus(AppStatus.IDLE);
    recognitionRef.current?.stop();
  }, []);

  const handleEnhance = async () => {
    if (!transcript) return;
    setStatus(AppStatus.PROCESSING);
    setActiveTab('ai');
    try {
      const result = await polishBanglaText(transcript);
      setAiOutput(result);
      setStatus(AppStatus.IDLE);
    } catch (err) {
      setErrorMsg("AI Enhancement failed.");
      setStatus(AppStatus.IDLE);
    }
  };

  const handleTranslate = async () => {
    if (!transcript) return;
    setStatus(AppStatus.PROCESSING);
    setActiveTab('ai');
    try {
      const result = await translateToEnglish(transcript);
      setAiOutput(result);
      setStatus(AppStatus.IDLE);
    } catch (err) {
      setErrorMsg("Translation failed.");
      setStatus(AppStatus.IDLE);
    }
  };

  const isProcessing = status === AppStatus.PROCESSING;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center py-10 px-4">
      <header className="mb-8 text-center max-w-2xl">
        <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-4 ring-8 ring-green-50">
          <MicrophoneIcon className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-2 font-bangla">বাংলা ভয়েস নোট</h1>
        <p className="text-slate-500 text-lg">Bangla Speech-to-Text Assistant with Gemini AI</p>
      </header>

      <main className="w-full max-w-3xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Controls Bar */}
        <div className="bg-slate-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <button
              onClick={toggleListening}
              className={`flex items-center justify-center gap-2 px-8 py-3 rounded-full text-white font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg ${
                status === AppStatus.LISTENING
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {status === AppStatus.LISTENING ? (
                <>
                  <StopIcon className="h-5 w-5" /> Stop
                </>
              ) : (
                <>
                  <MicrophoneIcon className="h-5 w-5" /> Start
                </>
              )}
            </button>
            <span className="text-slate-400 text-sm font-medium">
                {status === AppStatus.LISTENING ? 'Listening to Bangla...' : 'Ready to record'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              disabled={!transcript && !aiOutput}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors disabled:opacity-30"
              title="Clear All"
            >
              <TrashIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 py-4 text-center font-medium font-bangla text-lg transition-colors ${
              activeTab === 'transcript' 
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            মূল টেক্সট (Original)
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-4 text-center font-medium font-bangla text-lg transition-colors ${
              activeTab === 'ai' 
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            AI ফিক্স/অনুবাদ (AI Result)
          </button>
        </div>

        {/* Output Area */}
        <div className="relative min-h-[300px] p-8 bg-white">
          {errorMsg && (
             <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                {errorMsg}
             </div>
          )}

          {isProcessing ? (
             <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
               <div className="w-12 h-12 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
               <p>Processing with AI...</p>
             </div>
          ) : (
             <div className="font-bangla text-xl leading-relaxed text-slate-800 whitespace-pre-wrap">
                {activeTab === 'transcript' ? (
                  transcript || <span className="text-slate-300">Talk to start transcribing...</span>
                ) : (
                  aiOutput || <span className="text-slate-300">Use AI actions below to generate improved text.</span>
                )}
             </div>
          )}

          {/* Floating Copy Button */}
          {(activeTab === 'transcript' ? transcript : aiOutput) && (
            <button
              onClick={() => handleCopy(activeTab === 'transcript' ? transcript : aiOutput)}
              className="absolute top-4 right-4 p-2 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 text-slate-600 transition-all active:scale-95"
              title="Copy to Clipboard"
            >
              {isCopied ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <ClipboardDocumentIcon className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* AI Action Bar */}
        <div className="bg-slate-50 p-6 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">AI Powered Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleEnhance}
              disabled={!transcript || isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 font-medium hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="h-4 w-4" />
              Fix Grammar & Punctuation
            </button>
            <button
              onClick={handleTranslate}
              disabled={!transcript || isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 font-medium hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LanguageIcon className="h-4 w-4" />
              Translate to English
            </button>
          </div>
        </div>
      </main>

      <footer className="mt-12 text-slate-400 text-sm text-center">
        <p>Built with React, Tailwind, and Google Gemini</p>
      </footer>
    </div>
  );
};

export default App;