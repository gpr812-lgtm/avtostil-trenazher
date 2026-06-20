'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Phone } from 'lucide-react';
import { Scenario } from '@/data/scenarios';
import { CustomerFace } from '@/components/customer-face';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isPlaying?: boolean;
}

interface DialogueProps {
  messages: Message[];
  scenario: Scenario | null;
  isTyping: boolean;
  isProcessingVoice?: boolean;
  isBotSpeaking?: boolean;
}

export function Dialogue({ messages, scenario, isTyping, isProcessingVoice, isBotSpeaking = false }: DialogueProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAvatar, setShowAvatar] = useState(false);

  useEffect(() => { setShowAvatar(messages.length > 0 || isTyping); }, [messages.length, isTyping]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isTyping]);

  return (
    <div className="bg-muted/30 rounded-xl border border-border overflow-hidden" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'row' }}>
      {showAvatar && scenario && (
        <div className="flex-shrink-0 border-r border-border flex flex-col items-center justify-end relative overflow-hidden"
          style={{ width: '180px',
            background: scenario.difficulty === 'Сложный' ? 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
            : scenario.difficulty === 'Средний' ? 'linear-gradient(180deg, #1a2e1a 0%, #1e3a1e 50%, #2a4a2a 100%)'
            : 'linear-gradient(180deg, #2e1a1a 0%, #3e1e1e 50%, #4a2a2a 100%)' }}>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-2 right-2 h-12 bg-white/10 rounded border border-white/20" />
            <div className="absolute bottom-20 left-2 right-2 flex justify-around">
              <div className="w-8 h-4 bg-white/10 rounded-t-lg" /><div className="w-8 h-4 bg-white/10 rounded-t-lg" /><div className="w-8 h-4 bg-white/10 rounded-t-lg" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
          <CustomerFace customerName={scenario.customerName} isSpeaking={isBotSpeaking} isThinking={isTyping} size={150}
            appearance={scenario.appearance} lastUserMessage={messages.filter(m => m.role === 'user').slice(-1)[0]?.content} />
          <div className="mb-2 mt-1">
            {isBotSpeaking ? (<span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />говорит</span>)
            : isTyping ? (<span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />думает</span>)
            : (<span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full border border-border"><Phone className="w-2.5 h-2.5" />на связи</span>)}
          </div>
        </div>
      )}
      <div ref={scrollRef} className="overflow-y-auto overflow-x-hidden scrollbar-thin flex-1" style={{ minWidth: 0 }}>
        <div className="p-4 space-y-4">
          {messages.length === 0 && !isTyping && (<div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"><Phone className="w-12 h-12 mb-3 opacity-30" /><p className="text-sm">Выберите сценарий слева и нажмите «Начать звонок», чтобы клиент позвонил вам в автосалон.</p></div>)}
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 animate-slide-up ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <Avatar className="w-9 h-9 flex-shrink-0"><AvatarFallback className={message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'}>{message.role === 'user' ? <User className="w-4 h-4" /> : scenario?.customerName.charAt(0) || 'К'}</AvatarFallback></Avatar>
              <div className={`flex flex-col max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${message.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>{message.content}</div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">{message.role === 'user' ? 'Продавец' : scenario?.customerName || 'Клиент'}{' · '}{new Date(message.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
          {isTyping && (<div className="flex gap-3 animate-slide-up"><Avatar className="w-9 h-9 flex-shrink-0"><AvatarFallback className="bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300">{scenario?.customerName.charAt(0) || 'К'}</AvatarFallback></Avatar><div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1"><span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" /><span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" /><span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" /></div></div>)}
          {isProcessingVoice && (<div className="flex justify-center"><div className="bg-amber-50 text-amber-700 text-xs px-3 py-1.5 rounded-full flex items-center gap-2"><Phone className="w-3 h-3" />Распознавание речи...</div></div>)}
        </div>
      </div>
    </div>
  );
}
