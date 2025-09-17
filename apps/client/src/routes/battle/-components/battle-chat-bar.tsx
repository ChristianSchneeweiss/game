import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface BattleChatBarProps {
  messages: { user: string; message: string }[];
  sendMessage: (message: string) => void;
  isConnected: boolean;
}

export const BattleChatBar = ({
  messages,
  sendMessage,
  isConnected,
}: BattleChatBarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length > lastMessageCount && !isOpen) {
      setLastMessageCount(messages.length);
    } else if (isOpen) {
      setLastMessageCount(messages.length);
    }
  }, [messages.length, isOpen, lastMessageCount]);

  const handleSendMessage = () => {
    if (message.trim() && isConnected) {
      sendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setLastMessageCount(messages.length);
    }
  };

  const unreadCount = messages.length - lastMessageCount;

  return (
    <div className="fixed right-4 bottom-4 z-50">
      {/* Chat Toggle Button */}
      <div className="relative">
        <Button
          onClick={toggleChat}
          variant="outline"
          size="icon"
          className={`h-14 w-14 rounded-full border-slate-600 bg-slate-800/95 text-white shadow-xl backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-slate-700/95 ${
            isOpen ? "bg-blue-600/90 hover:bg-blue-700/90" : ""
          }`}
        >
          <MessageCircle
            className={`h-6 w-6 transition-transform duration-200 ${isOpen ? "rotate-12" : ""}`}
          />
        </Button>

        {/* Unread Message Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div
        className={`absolute right-0 bottom-16 transition-all duration-300 ease-in-out ${
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <div className="h-96 w-80 rounded-lg border border-slate-600 bg-slate-800/95 shadow-xl backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-600 p-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Battle Chat</h3>
              <div
                className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}
              />
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:bg-slate-700/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="h-64 flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  <span className="text-xs font-medium text-blue-400">
                    {msg.user}
                  </span>
                  <div className="rounded-lg bg-slate-700/50 px-3 py-2">
                    <p className="text-sm text-white">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-600 p-3">
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={!isConnected}
                className="flex-1 border-slate-600 bg-slate-700/50 text-white placeholder:text-gray-400 focus:border-blue-400"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || !isConnected}
                size="icon"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
