/**
 * useSocket — singleton Socket.IO connection hook
 *
 * Establishes an authenticated Socket.IO connection on mount and tears it
 * down on unmount. Exposes the socket instance and online/error state.
 *
 * Usage:
 *   const { socket, connected } = useSocket();
 *   // socket is null until auth token is available
 */

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "./auth";

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000"
).replace(/\/$/, "");

export interface UseSocketResult {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
}

export function useSocket(): UseSocketResult {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function connect() {
      try {
        const token = await getToken();
        if (!token || !active) return;

        const socket = io(BASE_URL, {
          transports: ["websocket", "polling"],
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          if (active) {
            setConnected(true);
            setError(null);
          }
        });

        socket.on("disconnect", () => {
          if (active) setConnected(false);
        });

        socket.on("connect_error", (err) => {
          if (active) {
            setConnected(false);
            setError(err.message ?? "Connection failed");
          }
        });

        socket.on("error", (payload: { message: string }) => {
          if (active) setError(payload?.message ?? "Socket error");
        });
      } catch (err: any) {
        if (active) setError(err?.message ?? "Failed to connect");
      }
    }

    connect();

    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, []);

  return { socket: socketRef.current, connected, error };
}
