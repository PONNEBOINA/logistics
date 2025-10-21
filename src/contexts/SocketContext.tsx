import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/MongoAuthContext';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export { SocketContext };
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4001';

  const query = useMemo(() => {
    if (!user) return undefined;
    const role = (user.role || '').toLowerCase();
    // expected role: 'customer' | 'driver'
    return { role, userId: user.id };
  }, [user]);

  useEffect(() => {
    if (!query) return;
    const s = io(backendUrl, { query, transports: ['websocket'] });
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [backendUrl, query?.role, query?.userId]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};
