'use client';

import { useEffect, useState, useRef } from 'react';
import { CustomerAppearance } from '@/data/scenarios';

interface CustomerFaceProps {
  customerName: string;
  isSpeaking?: boolean;
  isThinking?: boolean;
  size?: number;
  appearance?: CustomerAppearance;
  lastUserMessage?: string;
}

type Emotion = 'neutral' | 'happy' | 'surprised' | 'thinking' | 'annoyed' | 'angry' | 'sad' | 'excited';

function analyzeEmotion(text: string): Emotion {
  if (!text) return 'neutral';
  const lower = text.toLowerCase();
  if (/\b(мат|дурак|идиот|тупой|глупый|отстань|надоел|заткнис|хам|груб)\b/.test(lower)) return 'angry';
  if (/\b(нет|нельзя|невозможно|дорого|отказ|никак|не могу|не получится)\b/.test(lower)) return 'annoyed';
  if (/\b(миллион|миллиарда|дорого|очень|столько|шок|что|как|почему)\b/.test(lower)) return 'surprised';
  if (/\b(скидк|подар|бесплат|выгод|отлич|супер|класс|хорош|да|конечно|согласен)\b/.test(lower)) return 'happy';
  if (lower.includes('?') || /\b(какой|какая|сколько|когда|где)\b/.test(lower)) return 'thinking';
  if (/[!]{2,}/.test(text)) return 'excited';
  return 'neutral';
}

const HAIR_COLORS = {
  black: { main: '#2A1810', light: '#5A3A25', dark: '#1A0F08' },
  brown: { main: '#4A3020', light: '#8B6347', dark: '#2A1810' },
  blond: { main: '#C9A876', light: '#E8D4A8', dark: '#9B7D4F' },
  gray:  { main: '#8B8680', light: '#B8B3AC', dark: '#5C5852' },
  bald:  { main: '#E8B98C', light: '#F5C9A0', dark: '#D9A77B' },
};

const SKIN_TONES = {
  light:  { highlight: '#FFF0DC', mid: '#FAD4AC', shadow: '#C99265', dark: '#A07050' },
  medium: { highlight: '#FAD4AC', mid: '#E5B585', shadow: '#B8845C', dark: '#8B5E3C' },
  tan:    { highlight: '#E5B585', mid: '#C99265', shadow: '#A07050', dark: '#6B4A2F' },
  dark:   { highlight: '#A07050', mid: '#7A4F2E', shadow: '#5C3A1F', dark: '#3D2817' },
};

const OUTFIT_COLORS = {
  business: { main: '#1E3A7A', dark: '#15294F', light: '#4A6BC0' },
  casual:   { main: '#4A6B3A', dark: '#2E4A25', light: '#6B8E5A' },
  sport:    { main: '#7A4A2E', dark: '#5C3520', light: '#9B6B4F' },
  work:     { main: '#4A4A4A', dark: '#2A2A2A', light: '#6B6B6B' },
};

export function CustomerFace({
  customerName, isSpeaking = false, isThinking = false, size = 160,
  appearance, lastUserMessage,
}: CustomerFaceProps) {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [blink, setBlink] = useState(false);
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [armOffset, setArmOffset] = useState(0);
  const [headTilt, setHeadTilt] = useState(0);
  const [headRotateY, setHeadRotateY] = useState(0);
  const [bodyBob, setBodyBob] = useState(0);
  const [gesture, setGesture] = useState<'none' | 'scratch' | 'crossed' | 'thinking-pose'>('none');

  const hairColor = appearance?.hairColor || 'brown';
  const hairStyle = appearance?.hairStyle || 'short';
  const age = appearance?.age || 'middle';
  const eyewear = appearance?.eyewear || 'none';
  const facialHair = appearance?.facialHair || 'none';
  const outfit = appearance?.outfit || 'casual';
  const skinTone = appearance?.skinTone || 'light';
  const hair = HAIR_COLORS[hairColor];
  const skin = SKIN_TONES[skinTone];
  const clothes = OUTFIT_COLORS[outfit];

  // Реакция на слова продавца
  useEffect(() => {
    if (lastUserMessage) {
      const newEmotion = analyzeEmotion(lastUserMessage);
      setEmotion(newEmotion);
      if (newEmotion === 'thinking') setGesture('thinking-pose');
      else if (newEmotion === 'annoyed' || newEmotion === 'angry') setGesture('crossed');
      else if (newEmotion === 'surprised') setGesture('scratch');
      else setGesture('none');
      const timer = setTimeout(() => {
        if (!isSpeaking) { setEmotion('neutral'); setGesture('none'); }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastUserMessage, isSpeaking]);

  // Анимация рта
  useEffect(() => {
    if (!isSpeaking) { setMouthOpen(false); return; }
    let timeout: NodeJS.Timeout;
    const animate = () => { setMouthOpen(p => !p); timeout = setTimeout(animate, 70 + Math.random() * 130); };
    animate();
    return () => clearTimeout(timeout);
  }, [isSpeaking]);

  // Моргание
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const blinkOnce = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
      timeout = setTimeout(blinkOnce, 1800 + Math.random() * 3500);
    };
    timeout = setTimeout(blinkOnce, 1500 + Math.random() * 1500);
    return () => clearTimeout(timeout);
  }, []);

  // Жестикуляция
  useEffect(() => {
    if (!isSpeaking || gesture !== 'none') { setArmOffset(0); return; }
    let timeout: NodeJS.Timeout;
    const moveArms = () => { setArmOffset((Math.random() - 0.5) * 14); timeout = setTimeout(moveArms, 300 + Math.random() * 500); };
    moveArms();
    return () => clearTimeout(timeout);
  }, [isSpeaking, gesture]);

  // Кивание головой
  useEffect(() => {
    if (!isSpeaking) { setHeadTilt(0); setHeadRotateY(0); return; }
    let timeout: NodeJS.Timeout;
    const nod = () => { setHeadTilt((Math.random() - 0.5) * 8); setHeadRotateY((Math.random() - 0.5) * 12); timeout = setTimeout(nod, 400 + Math.random() * 600); };
    nod();
    return () => clearTimeout(timeout);
  }, [isSpeaking]);

  // Дыхание
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const breathe = () => { setBodyBob(p => p === 0 ? 1.5 : 0); timeout = setTimeout(breathe, 2400 + Math.random() * 800); };
    timeout = setTimeout(breathe, 2000);
    return () => clearTimeout(timeout);
  }, []);

  const eyebrowY = { neutral: 35, happy: 36, surprised: 32, thinking: 34, annoyed: 36, angry: 38, sad: 38, excited: 33 }[emotion];
  const eyebrowCurve = { neutral: 2, happy: 1, surprised: -1, thinking: 3, annoyed: 4, angry: 5, sad: 3, excited: 0 }[emotion];
  const mouthWidth = { neutral: 14, happy: 18, surprised: 10, thinking: 12, annoyed: 8, angry: 6, sad: 8, excited: 16 }[emotion];
  const eyeOpenness = emotion === 'surprised' ? 1.4 : emotion === 'angry' ? 0.6 : emotion === 'excited' ? 1.2 : 1;
  const showWrinkles = age === 'old';

  return (
    <div style={{ width: size, height: size * 1.4, perspective: '600px', perspectiveOrigin: '50% 40%' }}
      className={`relative ${isSpeaking ? 'animate-speak-bob' : ''} ${isThinking ? 'animate-think-pulse' : ''}`}>
      <svg width={size} height={size * 1.4} viewBox="0 0 200 280" style={{ overflow: 'visible', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25))' }}>
        <defs>
          <radialGradient id={`s-${skinTone}`} cx="35%" cy="25%" r="75%">
            <stop offset="0%" stopColor={skin.highlight} /><stop offset="30%" stopColor={skin.mid} />
            <stop offset="60%" stopColor={skin.shadow} /><stop offset="100%" stopColor={skin.dark} />
          </radialGradient>
          <linearGradient id="skin-sh" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#000" stopOpacity="0" /><stop offset="70%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id={`h-${hairColor}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={hair.light} /><stop offset="30%" stopColor={hair.main} /><stop offset="100%" stopColor={hair.dark} />
          </linearGradient>
          <linearGradient id={`sh-${outfit}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={clothes.light} /><stop offset="50%" stopColor={clothes.main} /><stop offset="100%" stopColor={clothes.dark} />
          </linearGradient>
          <radialGradient id="chin-sh" cx="50%" cy="30%" r="60%"><stop offset="0%" stopColor="#000" stopOpacity="0.3" /><stop offset="100%" stopColor="#000" stopOpacity="0" /></radialGradient>
          <linearGradient id="lips" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#9B4444" /><stop offset="50%" stopColor="#7A2E2E" /><stop offset="100%" stopColor="#5C2020" /></linearGradient>
        </defs>

        <g style={{ transform: `translateY(${bodyBob}px)`, transition: 'transform 0.6s ease-in-out' }}>
          {/* Тело */}
          <path d="M 35 210 Q 45 185, 75 178 L 125 178 Q 155 185, 165 210 L 170 280 L 30 280 Z" fill={`url(#sh-${outfit})`} />
          <path d="M 35 210 Q 45 185, 75 178 L 125 178 Q 155 185, 165 210 L 170 280 L 30 280 Z" fill="url(#skin-sh)" />
          {outfit === 'business' && (<><path d="M 80 178 L 100 200 L 120 178 L 115 173 L 100 190 L 85 173 Z" fill={clothes.dark} /><path d="M 97 200 L 103 200 L 105 215 L 100 225 L 95 215 Z" fill="#8B0000" /></>)}

          {/* Руки */}
          {gesture === 'crossed' ? (
            <><path d="M 50 200 Q 80 210, 120 210 Q 150 210, 160 200" fill="none" stroke={skin.shadow} strokeWidth="22" strokeLinecap="round" /><ellipse cx="55" cy="200" rx="11" ry="13" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" /><ellipse cx="145" cy="200" rx="11" ry="13" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" /></>
          ) : gesture === 'thinking-pose' ? (
            <><g style={{ transform: `translateY(${armOffset}px)`, transformOrigin: '155px 200px', transition: 'transform 0.3s' }}><path d="M 150 200 Q 178 205, 188 178 Q 193 162, 183 152" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" /><ellipse cx="185" cy="150" rx="11" ry="13" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" transform="rotate(20 185 150)" /></g><g style={{ transformOrigin: '45px 200px' }}><path d="M 50 200 Q 30 180, 50 150 Q 70 130, 85 140" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" /><ellipse cx="88" cy="138" rx="10" ry="12" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" transform="rotate(-30 88 138)" /></g></>
          ) : gesture === 'scratch' ? (
            <><g style={{ transform: `translateY(${armOffset}px)`, transformOrigin: '155px 200px', transition: 'transform 0.3s' }}><path d="M 150 200 Q 178 205, 188 178 Q 193 162, 183 152" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" /><ellipse cx="185" cy="150" rx="11" ry="13" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" transform="rotate(20 185 150)" /></g><g style={{ transformOrigin: '45px 200px' }}><path d="M 50 200 Q 20 180, 30 130 Q 40 80, 70 60" fill="none" stroke={skin.shadow} strokeWidth="14" strokeLinecap="round" /><ellipse cx="72" cy="58" rx="10" ry="12" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" /></g></>
          ) : (
            <><g style={{ transform: `translateY(${armOffset}px) rotate(${armOffset * 0.5}deg)`, transformOrigin: '155px 200px', transition: 'transform 0.3s' }}><path d="M 150 200 Q 178 205, 188 178 Q 193 162, 183 152" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" /><ellipse cx="185" cy="150" rx="11" ry="13" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" transform="rotate(20 185 150)" /></g><g style={{ transform: `translateY(${armOffset}px)`, transition: 'transform 0.3s' }}><rect x="175" y="132" width="18" height="28" rx="4" fill="#1F2937" stroke="#111827" strokeWidth="1.5" transform="rotate(15 184 146)" /><rect x="177" y="135" width="14" height="22" rx="1.5" fill="#10B981" transform="rotate(15 184 146)" /></g><g style={{ transform: `translateY(${-armOffset * 0.7}px) rotate(${isSpeaking ? armOffset * 2 : 0}deg)`, transformOrigin: '45px 200px', transition: 'transform 0.3s' }}><path d="M 50 200 Q 22 205, 12 178 Q 7 162, 17 152" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" /><ellipse cx="15" cy="150" rx="11" ry="13" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="1" transform="rotate(-20 15 150)" />{isSpeaking && (<><path d="M 11 138 Q 9 132, 13 130" fill="none" stroke={skin.dark} strokeWidth="1.5" strokeLinecap="round" /><path d="M 15 136 Q 15 130, 19 128" fill="none" stroke={skin.dark} strokeWidth="1.5" strokeLinecap="round" /><path d="M 19 138 Q 21 133, 25 132" fill="none" stroke={skin.dark} strokeWidth="1.5" strokeLinecap="round" /></>)}</g></>
          )}

          {/* Голова */}
          <g style={{ transform: `rotateY(${headRotateY}deg) rotate(${headTilt}deg)`, transformOrigin: '100px 100px', transition: 'transform 0.4s', transformStyle: 'preserve-3d' }}>
            <rect x="85" y="165" width="30" height="25" fill={`url(#s-${skinTone})`} />
            <ellipse cx="100" cy="95" rx="62" ry="70" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="0.5" />
            <ellipse cx="100" cy="95" rx="62" ry="70" fill="url(#skin-sh)" />
            {showWrinkles && (<><path d="M 55 85 Q 60 87, 65 85" fill="none" stroke={skin.dark} strokeWidth="0.8" opacity="0.5" /><path d="M 135 85 Q 140 87, 145 85" fill="none" stroke={skin.dark} strokeWidth="0.8" opacity="0.5" /></>)}
            <ellipse cx="40" cy="100" rx="9" ry="15" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="0.5" />
            <ellipse cx="160" cy="100" rx="9" ry="15" fill={`url(#s-${skinTone})`} stroke={skin.dark} strokeWidth="0.5" />

            {/* Волосы */}
            {hairColor !== 'bald' && (<><path d="M 38 80 Q 32 28, 100 20 Q 168 28, 162 80 Q 156 52, 130 46 Q 115 33, 100 36 Q 85 33, 70 46 Q 44 52, 38 80 Z" fill={`url(#h-${hairColor})`} />{hairStyle === 'long' && (<><path d="M 32 90 Q 25 130, 30 160" fill={`url(#h-${hairColor})`} /><path d="M 168 90 Q 175 130, 170 160" fill={`url(#h-${hairColor})`} /></>)}</>)}
            {hairColor === 'bald' && <ellipse cx="100" cy="50" rx="40" ry="25" fill={skin.highlight} opacity="0.5" />}

            {/* Борода */}
            {facialHair === 'beard' && <path d="M 60 130 Q 55 150, 70 165 Q 85 175, 100 175 Q 115 175, 130 165 Q 145 150, 140 130 Q 130 145, 100 150 Q 70 145, 60 130 Z" fill={`url(#h-${hairColor})`} opacity="0.9" />}
            {facialHair === 'stubble' && <ellipse cx="100" cy="150" rx="35" ry="20" fill={hair.main} opacity="0.2" />}
            {facialHair === 'mustache' && <path d="M 80 132 Q 90 138, 100 135 Q 110 138, 120 132 Q 115 128, 100 130 Q 85 128, 80 132 Z" fill={`url(#h-${hairColor})`} />}

            {/* Брови */}
            <path d={`M 62 ${eyebrowY} Q 75 ${eyebrowY - eyebrowCurve}, 88 ${eyebrowY}`} fill="none" stroke={hair.dark} strokeWidth="4" strokeLinecap="round" className="transition-all duration-300" />
            <path d={`M 112 ${eyebrowY} Q 125 ${eyebrowY - eyebrowCurve}, 138 ${eyebrowY}`} fill="none" stroke={hair.dark} strokeWidth="4" strokeLinecap="round" className="transition-all duration-300" />

            {/* Очки */}
            {eyewear === 'glasses' && (<><circle cx="75" cy="90" r="13" fill="none" stroke="#1A0F08" strokeWidth="2" /><circle cx="125" cy="90" r="13" fill="none" stroke="#1A0F08" strokeWidth="2" /><line x1="88" y1="90" x2="112" y2="90" stroke="#1A0F08" strokeWidth="2" /></>)}
            {eyewear === 'sunglasses' && (<><circle cx="75" cy="90" r="13" fill="#1A0F08" stroke="#000" strokeWidth="1.5" /><circle cx="125" cy="90" r="13" fill="#1A0F08" stroke="#000" strokeWidth="1.5" /><line x1="88" y1="90" x2="112" y2="90" stroke="#000" strokeWidth="2" /></>)}

            {/* Глаза */}
            {blink ? (<><path d="M 62 90 Q 75 94, 88 90" fill="none" stroke={hair.dark} strokeWidth="2.8" strokeLinecap="round" /><path d="M 112 90 Q 125 94, 138 90" fill="none" stroke={hair.dark} strokeWidth="2.8" strokeLinecap="round" /></>) : (<><ellipse cx="75" cy="90" rx="8" ry={7 * eyeOpenness} fill="white" /><ellipse cx="125" cy="90" rx="8" ry={7 * eyeOpenness} fill="white" /><circle cx="75" cy="90" r="5.5" fill="#5B3A1F" /><circle cx="125" cy="90" r="5.5" fill="#5B3A1F" /><circle cx="75" cy="90" r="2.5" fill="#0A0503" /><circle cx="125" cy="90" r="2.5" fill="#0A0503" /><circle cx="77" cy="88" r="1.5" fill="white" /><circle cx="127" cy="88" r="1.5" fill="white" /></>)}

            {/* Нос */}
            <ellipse cx="100" cy="122" rx="14" ry="5" fill="url(#chin-sh)" />
            <path d="M 100 92 L 92 120 Q 90 124, 95 124 L 105 124 Q 110 124, 108 120 Z" fill={skin.mid} stroke={skin.dark} strokeWidth="0.8" />

            {/* Щёки */}
            <ellipse cx="58" cy="128" rx="12" ry="7" fill="#E8806B" opacity={emotion === 'happy' ? 0.5 : emotion === 'angry' ? 0.7 : 0.3} className="transition-all duration-500" />
            <ellipse cx="142" cy="128" rx="12" ry="7" fill="#E8806B" opacity={emotion === 'happy' ? 0.5 : emotion === 'angry' ? 0.7 : 0.3} className="transition-all duration-500" />

            {/* Рот */}
            {isSpeaking ? (<><ellipse cx="100" cy="142" rx={mouthOpen ? 12 : 9} ry={mouthOpen ? 11 : 6} fill="url(#lips)" stroke="#3D1010" strokeWidth="1.5" className="transition-all duration-100" />{mouthOpen && <rect x="92" y="137" width="16" height="3.5" fill="white" rx="0.5" opacity="0.95" />}{mouthOpen && <ellipse cx="100" cy="148" rx="6" ry="3.5" fill="#C45B5B" />}</>) : isThinking ? (<><path d="M 90 142 Q 100 138, 110 142" fill="none" stroke="url(#lips)" strokeWidth="3" strokeLinecap="round" /><text x="160" y="80" fontSize="28" fill="#6B7280" fontWeight="bold" className="animate-pulse">?</text></>) : (<path d={`M ${100 - mouthWidth} 142 Q 100 ${emotion === 'happy' ? 150 : 146}, ${100 + mouthWidth} 142`} fill="none" stroke="url(#lips)" strokeWidth="3" strokeLinecap="round" className="transition-all duration-300" />)}

            <ellipse cx="100" cy="158" rx="20" ry="6" fill="url(#chin-sh)" />
          </g>
        </g>

        {isSpeaking && (<g className="animate-pulse"><path d="M 192 132 Q 200 132, 200 142" fill="none" stroke="#10B981" strokeWidth="2" opacity="0.6" /><path d="M 196 128 Q 208 131, 208 148" fill="none" stroke="#10B981" strokeWidth="2" opacity="0.4" /></g>)}
      </svg>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-background/90 backdrop-blur px-2.5 py-0.5 rounded-full border border-border shadow-sm">
        <span className="text-[11px] font-semibold">{customerName}</span>
        {isSpeaking && (<span className="flex items-center gap-0.5"><span className="w-0.5 h-2 bg-emerald-500 rounded animate-sound-wave" /><span className="w-0.5 h-3 bg-emerald-500 rounded animate-sound-wave" style={{ animationDelay: '100ms' }} /><span className="w-0.5 h-2.5 bg-emerald-500 rounded animate-sound-wave" style={{ animationDelay: '200ms' }} /></span>)}
      </div>
    </div>
  );
}
