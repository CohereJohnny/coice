'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Bot,
  User,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ImageData } from './types';

interface ImageChatProps {
  /** Image data for context */
  image: ImageData;
  /** Optional className for styling */
  className?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

/**
 * ImageChat component provides an interface for asking questions about the image
 * Focused responsibility: Handle chat interactions with vision language models
 */
export function ImageChat({ image, className }: ImageChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // TODO: Replace with actual VLLM API integration
      const response = await fetch('/api/images/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: image.id,
          message: userMessage.content,
          imageUrl: image.signedUrls?.original || image.signedUrls?.thumbnail,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from VLLM');
      }

      const data = await response.json();
      
      // Replace loading message with actual response
      setMessages(prev => 
        prev.map(msg => 
          msg.loading 
            ? { ...msg, content: data.response || 'I can see the image but encountered an error processing your question.', loading: false }
            : msg
        )
      );
    } catch (error) {
      console.error('Chat error:', error);
      
      // Replace loading message with error response
      setMessages(prev => 
        prev.map(msg => 
          msg.loading 
            ? { 
                ...msg, 
                content: 'I apologize, but I\'m having trouble analyzing this image right now. The VLLM service may not be available. Please try again later.', 
                loading: false 
              }
            : msg
        )
      );
      
      toast.error('Failed to get response from vision model');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key (Shift+Enter for new line, Enter to submit)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Clear conversation
  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  // Quick question suggestions
  const quickQuestions = [
    "What objects can you see in this image?",
    "Describe the scene in detail",
    "What colors are prominent in this image?",
    "Are there any people or animals in this image?",
    "What is the mood or atmosphere of this image?",
    "Can you identify any text in this image?",
  ];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    textareaRef.current?.focus();
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Chat with Vision AI
          <Badge variant="outline" className="ml-2">
            <Sparkles className="h-3 w-3 mr-1" />
            VLLM
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ask questions about this image and get detailed analysis from our vision language model.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chat Messages */}
        <div className="border rounded-lg">
          <div className="h-64 p-4 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <p className="text-sm text-muted-foreground">
                  No messages yet. Ask a question about this image below.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                        message.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyzing image...</span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Quick Questions (when no messages) */}
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1 px-2"
                  onClick={() => handleQuickQuestion(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about this image..."
                className="min-h-[60px] resize-none"
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                size="sm"
                className="px-3"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              {messages.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  disabled={isLoading}
                  className="px-3"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </CardContent>
    </Card>
  );
} 