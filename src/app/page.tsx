'use client';

import { useEffect, useRef, useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';

type LLMResponse = {
  id: number;
  model: string;
  content: string;
  rating?: number;
};

type Message = {
  id: number;
  question: string;
  responses: LLMResponse[];
};

export default function HomePage() {
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

// pages/index.tsx (or wherever your HomePage lives)

// pages/index.tsx (inside HomePage)

const fetchLLMResponses = async (question: string): Promise<LLMResponse[]> => {
  const llmEndpoints = [

    { model: 'LLaMA 3',   url: 'http://127.0.0.1:5000/api/llama3',    payloadKey: 'input' },
  
  ];

  const responses = await Promise.all(
    llmEndpoints.map(async ({ model, url, payloadKey }, idx) => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [payloadKey]: question }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { response } = await res.json();

        return {
          id: Date.now() + idx + 1,
          model,
          content: response ?? `Empty response from ${model}`,
        };
      } catch (err) {
        return {
          id: Date.now() + idx + 1,
          model,
          content: `⚠️ Failed to fetch from ${model}: ${err}`,
        };
      }
    })
  );

  return responses;
};


  const sendMessage = async () => {
    if (!input.trim()) return;

    const userQuestion = input.trim();
    setInput('');

    const newMessage: Message = {
      id: Date.now(),
      question: userQuestion,
      responses: [],
    };

    setChatHistory((prev) => [...prev, newMessage]);

    const responses = await fetchLLMResponses(userQuestion);

    setChatHistory((prev) =>
      prev.map((msg) =>
        msg.id === newMessage.id
          ? { ...msg, responses }
          : msg
      )
    );
  };

  const rateResponse = (messageId: number, responseId: number, rating: number) => {
    setChatHistory((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              responses: msg.responses.map((res) =>
                res.id === responseId ? { ...res, rating } : res
              ),
            }
          : msg
      )
    );
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <main className="flex flex-col h-screen max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">ADDINN customer chatbot</h1>

      <div className="flex-1 overflow-y-auto space-y-8">
        {chatHistory.map((msg) => (
          <div key={msg.id} className="space-y-3">
            <div className="text-lg font-semibold bg-blue-50 p-3 rounded-md shadow-sm">
              🧑‍💻 You asked: <span className="italic">{msg.question}</span>
            </div>

            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
              {msg.responses.map((res) => (
                <div key={res.id} className="bg-white border p-4 rounded-md shadow-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">{res.model}</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon
                          key={star}
                          className={`h-5 w-5 cursor-pointer transition ${
                            res.rating && res.rating >= star
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                          onClick={() => rateResponse(msg.id, res.id, star)}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">{res.content}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-6 flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-4 py-2 shadow-sm"
          placeholder="Ask something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
        >
          Send
        </button>
      </div>
    </main>
  );
}
