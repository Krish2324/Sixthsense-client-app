import { useEffect, useRef, useCallback, useState } from 'react';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const WS_URL = BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

export function useWebSocket(userId: string | null, options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!userId || !WS_URL) return;

    try {
      const ws = new WebSocket(`${WS_URL}/api/ws/${userId}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        options.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          options.onMessage?.(message);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        options.onDisconnect?.();

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        options.onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [userId, options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    return sendMessage({
      type: 'join_conversation',
      conversation_id: conversationId,
    });
  }, [sendMessage]);

  const leaveConversation = useCallback((conversationId: string) => {
    return sendMessage({
      type: 'leave_conversation',
      conversation_id: conversationId,
    });
  }, [sendMessage]);

  const sendChatMessage = useCallback((conversationId: string, receiverId: string, content: string, imageUrl?: string) => {
    return sendMessage({
      type: 'message',
      conversation_id: conversationId,
      receiver_id: receiverId,
      content,
      image_url: imageUrl,
    });
  }, [sendMessage]);

  const sendTypingIndicator = useCallback((conversationId: string, receiverId: string, isTyping: boolean) => {
    return sendMessage({
      type: 'typing',
      conversation_id: conversationId,
      receiver_id: receiverId,
      is_typing: isTyping,
    });
  }, [sendMessage]);

  const sendReadReceipt = useCallback((messageIds: string[], senderId: string) => {
    return sendMessage({
      type: 'read_receipt',
      message_ids: messageIds,
      sender_id: senderId,
    });
  }, [sendMessage]);

  useEffect(() => {
    if (options.autoConnect !== false && userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, options.autoConnect, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    sendChatMessage,
    sendTypingIndicator,
    sendReadReceipt,
    joinConversation,
    leaveConversation,
    connect,
    disconnect,
  };
}
