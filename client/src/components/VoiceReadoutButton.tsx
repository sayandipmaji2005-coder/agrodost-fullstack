import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

interface VoiceReadoutButtonProps {
  textToRead: string;
  hindiText?: string;
  bengaliText?: string;
  className?: string;
}

export const VoiceReadoutButton: React.FC<VoiceReadoutButtonProps> = ({
  textToRead,
  hindiText,
  bengaliText,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [currentLang, setCurrentLang] = useState<'hi' | 'bn' | 'en'>('hi');

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel(); // Reset any existing speech

    let text = textToRead;
    let lang = 'en-IN';

    if (currentLang === 'hi' && hindiText) {
      text = hindiText;
      lang = 'hi-IN';
    } else if (currentLang === 'bn' && bengaliText) {
      text = bengaliText;
      lang = 'bn-IN';
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.92; // Slightly slower pace for clarity
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  if (!isSupported) return null;

  const langLabels = {
    hi: 'हिन्दी',
    bn: 'বাংলা',
    en: 'English'
  };

  const cycleLang = () => {
    if (isPlaying) window.speechSynthesis.cancel();
    setIsPlaying(false);
    if (currentLang === 'hi') setCurrentLang('bn');
    else if (currentLang === 'bn') setCurrentLang('en');
    else setCurrentLang('hi');
  };

  const getButtonLabel = () => {
    if (isPlaying) return 'Stop Audio';
    if (currentLang === 'hi') return '[🔊 Suniye Dawai Ki Jankari]';
    if (currentLang === 'bn') return '[🔊 ওষুধ সম্পর্কিত তথ্য শুনুন]';
    return '[🔊 Suniye Dawai Ki Jankari]';
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={toggleSpeech}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all shadow-md ${
          isPlaying
            ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
            : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98'
        }`}
        title="1-Click Audio Prescription (Hindi & Bengali Speech Synthesis)"
      >
        {isPlaying ? (
          <>
            <VolumeX className="w-4 h-4" />
            <span>Stop Audio</span>
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4 text-amber-300" />
            <span>{getButtonLabel()}</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={cycleLang}
        className="px-2.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors shadow-xs"
        title="Toggle between Hindi (hi-IN), Bengali (bn-IN), and English (en-IN)"
      >
        🌐 {langLabels[currentLang]}
      </button>
    </div>
  );
};
