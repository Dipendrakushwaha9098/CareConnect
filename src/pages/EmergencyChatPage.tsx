import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Video, LifeBuoy, MoreVertical, ShieldAlert, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VideoCallModal from "@/components/VideoCallModal";
import { useAuth } from "@/context/AuthContext";

type Message = {
  id: string;
  role: "user" | "doctor" | "ai" | "system";
  text: string;
  time: string;
};

export default function EmergencyChatPage() {
  const { user } = useAuth();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "sys-1",
      role: "system",
      text: "You are connected to the CareConnect Support Hub.",
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    },
    {
      id: "ai-1",
      role: "ai",
      text: `Hello ${user?.name || "Patient"}. All our human doctors are currently assisting other patients. I am the AI Care Assistant. How can I help you today?`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newUserMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      text: inputText,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText("");
    setIsAiTyping(true);

    // AI Mock Logic Responder
    setTimeout(() => {
      const lowerText = newUserMsg.text.toLowerCase();
      let aiResponseText = "I understand. Since no doctors are available to chat right now, I highly recommend booking an urgent slot or starting a video call to stay in the queue.";
      
      if (lowerText.includes("pain") || lowerText.includes("hurt") || lowerText.includes("emergency")) {
        aiResponseText = "It sounds like you might be experiencing significant distress. If this is a life-threatening medical emergency, please call your local emergency services (e.g., 911) immediately.";
      } else if (lowerText.includes("appointment") || lowerText.includes("book")) {
        aiResponseText = "If you'd like to book an appointment, please head back to your Portal using the sidebar. I can help answer basic questions in the meantime!";
      } else if (lowerText.includes("prescription") || lowerText.includes("refill")) {
        aiResponseText = "Prescription refills require evaluation by a doctor. You can request a refill from the Prescriptions tab on your dashboard.";
      } else if (lowerText.includes("fever") || lowerText.includes("sick") || lowerText.includes("cough")) {
        aiResponseText = "Make sure you rest and stay hydrated. You can start a Video Consultation by clicking the Video button at the top if you'd like a doctor to evaluate you as soon as they are free.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          text: aiResponseText,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        }
      ]);
      setIsAiTyping(false);
    }, 1500); // Simulate network/typing delay
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] relative bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md z-10 shrink-0 shadow-sm relative">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm z-10 relative">
              <LifeBuoy className="w-6 h-6 text-blue-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-400 border-2 border-white rounded-full sm:hidden" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
              Emergency Support 
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold items-center gap-1 border border-orange-200">
                <ShieldAlert className="w-3 h-3" /> High Priority Ring
              </span>
            </h2>
            <p className="text-sm text-gray-500 font-medium">Assigned: <span className="text-blue-600 font-bold flex items-center gap-1 inline-flex"><Sparkles className="w-3 h-3"/> AI Assistant (Doctors Busy)</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsVideoModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-200 rounded-xl px-4 flex items-center gap-2 transition-all hover:scale-105"
          >
            <Video className="w-4 h-4" /> <span className="hidden sm:block">Start Video</span>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 text-gray-500 hidden sm:flex">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50 custom-scrollbar">
        {messages.map((msg, i) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} ${msg.role === "system" ? "justify-center" : ""}`}
          >
            {msg.role === "system" ? (
              <div className="px-4 py-1.5 rounded-full bg-gray-200/50 border border-gray-200 text-xs font-medium text-gray-500 mt-2 mb-4">
                {msg.text}
              </div>
            ) : (
              <div className={`flex gap-3 max-w-[85%] sm:max-w-[70%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                
                {/* Avatar */}
                <div className="flex-shrink-0 mt-auto">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                    msg.role === "user" ? "bg-gray-800 text-white" : "bg-blue-600 text-white"
                  }`}>
                    {msg.role === "user" ? <UserRound className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                </div>

                {/* Bubble */}
                <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`px-4 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-gray-900 border border-gray-800 text-white rounded-br-sm" 
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1.5 px-1 font-medium">{msg.time}</span>
                </div>

              </div>
            )}
          </motion.div>
        ))}

        {/* AI Typing Indicator */}
        <AnimatePresence>
          {isAiTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex justify-start"
            >
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm bg-blue-600 text-white mt-auto">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-white border border-gray-200 rounded-bl-sm shadow-sm flex items-center gap-1.5">
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0 relative z-10">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-3 relative">
          <div className="flex-1 relative">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isAiTyping ? "AI is typing..." : "Type your message..."}
              disabled={isAiTyping}
              className="h-14 pr-14 pl-5 rounded-2xl bg-gray-50 border-gray-200 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 shadow-inner text-[15px]" 
            />
          </div>
          <Button 
            type="submit"
            disabled={!inputText.trim() || isAiTyping}
            className="w-14 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            <Send className="w-5 h-5 ml-1" />
          </Button>
        </form>
      </div>

      {/* Telemedicine Video Modal */}
      <VideoCallModal 
        isOpen={isVideoModalOpen} 
        onClose={() => setIsVideoModalOpen(false)} 
        doctorName="Emergency Consultation" 
      />

    </div>
  );
}
