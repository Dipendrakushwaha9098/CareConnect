import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";

// Connect to localhost:3001
const SOCKET_URL = "http://localhost:3001";

export const useSocket = (customUserId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const activeUserId = customUserId || user?.id;

  useEffect(() => {
    const socketInstance = io(SOCKET_URL);
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setIsConnected(true);
      if (activeUserId) {
        socketInstance.emit("authenticate", { userId: activeUserId });
        socketInstance.emit("joinUserRoom", activeUserId);
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [activeUserId]);

  useEffect(() => {
    if (socket && isConnected && activeUserId) {
      socket.emit("authenticate", { userId: activeUserId });
      socket.emit("joinUserRoom", activeUserId);
    }
  }, [socket, isConnected, activeUserId]);

  return { socket, isConnected };
};

