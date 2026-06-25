'use client';

interface FeedbackTimelineProps {
  messages: Array<{ role: string; content: string }>;
  feedback?: any;
}

// Заглушка таймлайна разбора диалога.
export function FeedbackTimeline({ messages }: FeedbackTimelineProps) {
  if (!messages || messages.length === 0) return null;
  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {messages.map((m, i) => (
        <div
          key={i}
          className={`flex gap-2 text-xs ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] p-2 rounded ${
              m.role === 'user'
                ? 'bg-blue-100 text-blue-900'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <div className="font-medium mb-0.5">
              {m.role === 'user' ? 'Продавец' : 'Клиент'}
            </div>
            <div>{m.content.replace('[[DIALOGUE_END]]', '')}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
