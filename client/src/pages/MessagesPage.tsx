import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import type { ChatMessage, User } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: conversationsLoading } = useQuery<User[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages", selectedUser?.id],
    enabled: !!selectedUser,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { recipientUserId: string; content: string }) => {
      return await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedUser?.id] });
      setMessageText("");
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedUser) return;
    sendMessageMutation.mutate({
      recipientUserId: selectedUser.id,
      content: messageText,
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-6">
      <h1 className="text-4xl font-serif font-bold text-foreground mb-6">
        Messages
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
        <Card className="lg:col-span-1">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-80px)]">
            {conversationsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations && conversations.length > 0 ? (
              <div className="p-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-md cursor-pointer hover-elevate ${
                      selectedUser?.id === conv.id ? "bg-accent" : ""
                    }`}
                    onClick={() => setSelectedUser(conv)}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={conv.profileImageUrl || undefined} alt={conv.name} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(conv.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{conv.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">
                          Click to start messaging
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No conversations yet
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          {selectedUser ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedUser.profileImageUrl || undefined} alt={selectedUser.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedUser.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.city && selectedUser.country
                        ? `${selectedUser.city}, ${selectedUser.country}`
                        : "Online"}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={i % 2 === 0 ? "flex justify-end" : "flex justify-start"}>
                        <Skeleton className="h-12 w-3/4 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwnMessage = message.senderUserId === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                          data-testid={`message-${message.id}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                )}
              </ScrollArea>

              <CardContent className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    data-testid="input-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation to start messaging
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
