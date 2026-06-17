'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Phone, PhoneOff } from 'lucide-react';
import { Scenario } from '@/data/scenarios';

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
}

export function Dialogue({
  messages,
  scenario,
  isTyping,
  isProcessingVoice,
}: DialogueProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isTyping]);

  return (
    <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        <ScrollArea className="flex-1 scrollbar-thin">
          <div className="p-4 space-y-4">
            {messages.length === 0 && !isTyping && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Phone className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">
                  Выберите сценарий слева и нажмите «Начать звонок»,
                  чтобы клиент позвонил вам в автосалон.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-slide-up ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarFallback
                    className={
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground'
                    }
                  >
                    {message.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      scenario?.customerName.charAt(0) || 'К'
                    )}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex flex-col max-w-[75%] ${
                    message.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    }`}
                  >
                    {message.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {message.role === 'user'
                      ? 'Продавец'
                      : scenario?.customerName || 'Клиент'}
                    {' · '}
                    {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 animate-slide-up">
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {scenario?.customerName.charAt(0) || 'К'}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {isProcessingVoice && (
              <div className="flex justify-center">
                <div className="bg-amber-50 text-amber-700 text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                  <PhoneOff className="w-3 h-3" />
                  Распознавание речи...
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

import { ScrollArea } from '@/components/ui/scroll-area';
