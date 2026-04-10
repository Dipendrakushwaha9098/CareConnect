import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorName?: string;
}

export default function VideoCallModal({ isOpen, onClose, doctorName = "Dr. Sarah Mitchell" }: VideoCallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 sm:p-8 backdrop-blur-sm ${
            isExpanded ? "p-0" : ""
          }`}
        >
          <div
            className={`relative w-full max-w-5xl bg-slate-900 overflow-hidden shadow-2xl flex flex-col ${
              isExpanded ? "h-full max-w-none rounded-none" : "h-[85vh] rounded-3xl border border-white/10"
            }`}
          >
            {/* Header info */}
            <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-20 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
              <div>
                <h3 className="text-white font-display text-xl sm:text-2xl font-bold tracking-tight shadow-sm drop-shadow-md">
                  {doctorName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-white/80 text-sm font-medium">{formatTime(callDuration)}</span>
                </div>
              </div>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors pointer-events-auto"
              >
                {isExpanded ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>

            {/* Main Video Stream (Doctor) */}
            <div className="flex-1 relative bg-slate-800 flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=1200"
                alt="Doctor Video Stream"
                className="w-full h-full object-cover opacity-80"
              />
              {/* Fallback avatar if video off */}
            </div>

            {/* PIP Self Video Stream */}
            <motion.div
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.2}
              className="absolute bottom-24 right-4 sm:bottom-28 sm:right-8 w-32 h-44 sm:w-48 sm:h-64 bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl shadow-black/50 cursor-grab active:cursor-grabbing z-20"
            >
              {isVideoOff ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 border border-gray-800">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
                    ME
                  </div>
                </div>
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400"
                  alt="Self Video Stream"
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )}
              {isMuted && (
                <div className="absolute bottom-2 left-2 p-1.5 bg-black/60 rounded-lg backdrop-blur-md">
                  <MicOff className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </motion.div>

            {/* Controls bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-20 flex justify-center items-center gap-4 sm:gap-6 pb-8 sm:pb-10">
              <Button
                onClick={() => setIsMuted(!isMuted)}
                variant="outline"
                className={`w-14 h-14 rounded-full border-none shadow-lg transition-all hover:scale-105 active:scale-95 ${
                  isMuted ? "bg-red-500/90 text-white hover:bg-red-500" : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-md"
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>

              <Button
                onClick={() => setIsVideoOff(!isVideoOff)}
                variant="outline"
                className={`w-14 h-14 rounded-full border-none shadow-lg transition-all hover:scale-105 active:scale-95 ${
                  isVideoOff ? "bg-red-500/90 text-white hover:bg-red-500" : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-md"
                }`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </Button>

              <Button
                onClick={onClose}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95 px-0"
              >
                <PhoneOff className="w-7 h-7" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
