import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Send, Plus, Search, MessageSquare, ArrowLeft, Users, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient, getMediaUrl } from "@/lib/queryClient";

// Server returns conversations enriched with lastMessage + unreadCount
type ConversationUser = {
  id: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
  city: string | null;
  country: string | null;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderUserId: string;
  } | null;
  unreadCount: number;
};

type Message = {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  content: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
};

type Member = {
  id: string;
  name: string;
  profileImageUrl: string | null;
  city: string | null;
  country: string | null;
};

type CommunityPost = {
  id: string;
  content: string;
  createdAt: string;
  authorUserId: string;
  authorName: string;
  authorProfileImageUrl: string | null;
  authorCity: string | null;
  authorCountry: string | null;
};

function getInitials(name: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function relativeTime(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString();
}

function timeLabel(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [selectedConv, setSelectedConv] = useState<ConversationUser | null>(null);
  const [messageText, setMessageText] = useState("");
  const [convSearch, setConvSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("direct");
  const [postText, setPostText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const postInputRef = useRef<HTMLTextAreaElement>(null);

  // Parse ?user= param for direct links from member profiles
  const targetUserId = new URLSearchParams(search).get("user");

  // Conversations list — refresh every 10s
  const { data: conversations = [], isLoading: convsLoading } = useQuery<ConversationUser[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 10000,
  });

  // Messages for selected conversation — poll every 3s
  const { data: messages = [], isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedConv?.id],
    enabled: !!selectedConv,
    refetchInterval: 3000,
  });

  // Members for new conversation dialog
  const { data: members = [], isLoading: membersLoading } = useQuery<{ data: Member[]; pagination: any }, Error, Member[]>({
    queryKey: ["/api/members"],
    enabled: newMsgOpen,
    select: (res) => res.data,
  });

  // Fetch target member when navigating from a profile via ?user=
  const { data: targetMember } = useQuery<Member>({
    queryKey: ["/api/members", targetUserId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/members/${targetUserId}`);
      return res.json();
    },
    enabled: !!targetUserId && !selectedConv,
  });

  // Auto-open conversation when target member loads
  useEffect(() => {
    if (!targetMember || selectedConv) return;
    const existing = conversations.find((c) => c.id === targetMember.id);
    setSelectedConv(
      existing ?? {
        id: targetMember.id,
        name: targetMember.name,
        email: "",
        profileImageUrl: targetMember.profileImageUrl,
        city: targetMember.city,
        country: targetMember.country,
        lastMessage: null,
        unreadCount: 0,
      }
    );
    // Clean up the URL param without a page reload
    setLocation("/messages", { replace: true });
  }, [targetMember, conversations]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", {
        recipientUserId: selectedConv!.id,
        content,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConv?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessageText("");
      inputRef.current?.focus();
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset on conversation switch
  useEffect(() => {
    setMessageText("");
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "instant" }), 50);
    inputRef.current?.focus();
  }, [selectedConv?.id]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedConv || sendMutation.isPending) return;
    sendMutation.mutate(messageText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startConversation = (member: Member) => {
    const existing = conversations.find((c) => c.id === member.id);
    setSelectedConv(
      existing ?? {
        id: member.id,
        name: member.name,
        email: "",
        profileImageUrl: member.profileImageUrl,
        city: member.city,
        country: member.country,
        lastMessage: null,
        unreadCount: 0,
      }
    );
    setNewMsgOpen(false);
    setMemberSearch("");
  };

  const filteredConvs = conversations.filter((c) =>
    c.name.toLowerCase().includes(convSearch.toLowerCase())
  );

  const filteredMembers = members.filter(
    (m) =>
      m.id !== (user as any)?.id &&
      m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Group messages by date for separators
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    const label = dateLabel(msg.createdAt);
    const last = groupedMessages[groupedMessages.length - 1];
    if (!last || last.date !== label) {
      groupedMessages.push({ date: label, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
  });

  // Community posts — poll every 15s
  const { data: communityPosts = [], isLoading: postsLoading } = useQuery<CommunityPost[]>({
    queryKey: ["/api/community-posts"],
    refetchInterval: 15000,
    enabled: activeTab === "community",
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/community-posts", { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-posts"] });
      setPostText("");
      postInputRef.current?.focus();
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await apiRequest("DELETE", `/api/community-posts/${postId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-posts"] });
    },
  });

  const handlePostSubmit = () => {
    if (!postText.trim() || createPostMutation.isPending) return;
    createPostMutation.mutate(postText.trim());
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-73px)]">
      {/* Tab switcher */}
      <div className="border-b bg-background px-4 pt-3 pb-0 flex-shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9">
            <TabsTrigger value="direct" className="gap-1.5 text-sm">
              <MessageSquare className="h-4 w-4" />
              Direct
              {totalUnread > 0 && (
                <span className="ml-1 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="community" className="gap-1.5 text-sm">
              <Users className="h-4 w-4" />
              Community Board
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "community" ? (
        /* ── Community Board ── */
        <div className="flex flex-col flex-1 min-h-0">
          {/* Post input */}
          <div className="p-4 border-b bg-background flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={postInputRef}
                placeholder="Post a message to the whole community..."
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handlePostSubmit();
                  }
                }}
                rows={2}
                disabled={createPostMutation.isPending}
                className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                data-testid="input-community-post"
              />
              <Button
                onClick={handlePostSubmit}
                disabled={!postText.trim() || createPostMutation.isPending}
                size="icon"
                data-testid="button-post-community"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Posts feed */}
          <ScrollArea className="flex-1 px-4 py-4">
            {postsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : communityPosts.length > 0 ? (
              <div className="space-y-4">
                {communityPosts.map((post) => {
                  const isOwn = post.authorUserId === (user as any)?.id;
                  return (
                    <div key={post.id} className="flex gap-3 group">
                      <Avatar className="h-9 w-9 flex-shrink-0 mt-0.5">
                        <AvatarImage src={getMediaUrl(post.authorProfileImageUrl) ?? undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getInitials(post.authorName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{post.authorName}</span>
                            {(post.authorCity || post.authorCountry) && (
                              <span className="text-xs text-muted-foreground">
                                {[post.authorCity, post.authorCountry].filter(Boolean).join(", ")}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">{relativeTime(post.createdAt)}</span>
                          </div>
                          {isOwn && (
                            <button
                              onClick={() => deletePostMutation.mutate(post.id)}
                              disabled={deletePostMutation.isPending}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
                              title="Delete post"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No community posts yet</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to post a message for everyone!</p>
              </div>
            )}
          </ScrollArea>
        </div>
      ) : (
      /* ── Direct Messages ── */
      <div className="flex flex-1 min-h-0">
      {/* Sidebar — conversation list */}
      <div
        className={`flex flex-col border-r bg-background w-full lg:w-80 flex-shrink-0 ${
          selectedConv ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Messages</h1>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                {totalUnread}
              </Badge>
            )}
          </div>
          <Dialog open={newMsgOpen} onOpenChange={setNewMsgOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" data-testid="button-new-message">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
              </DialogHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <ScrollArea className="max-h-72">
                {membersLoading ? (
                  <div className="space-y-2 p-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </div>
                ) : filteredMembers.length > 0 ? (
                  <div className="space-y-1 p-1">
                    {filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => startConversation(m)}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getMediaUrl(m.profileImageUrl) ?? undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {getInitials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          {(m.city || m.country) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[m.city, m.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {memberSearch ? "No members found" : "No members available"}
                  </p>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search conversations */}
        <div className="px-4 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          {convsLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvs.length > 0 ? (
            <div className="py-1">
              {filteredConvs.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                const isOwn = conv.lastMessage?.senderUserId === (user as any)?.id;
                return (
                  <button
                    key={conv.id}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors relative ${
                      isSelected ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedConv(conv)}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={getMediaUrl(conv.profileImageUrl) ?? undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getInitials(conv.name)}
                        </AvatarFallback>
                      </Avatar>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
                          {conv.name}
                        </p>
                        {conv.lastMessage && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {relativeTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {conv.lastMessage
                          ? `${isOwn ? "You: " : ""}${conv.lastMessage.content}`
                          : "Start a conversation"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {convSearch ? "No conversations match" : "No messages yet"}
              </p>
              {!convSearch && (
                <p className="text-xs text-muted-foreground mt-1">
                  Click + to start a new conversation
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat panel */}
      <div className={`flex flex-col flex-1 min-w-0 ${selectedConv ? "flex" : "hidden lg:flex"}`}>
        {selectedConv ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 lg:hidden flex-shrink-0"
                onClick={() => setSelectedConv(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarImage src={getMediaUrl(selectedConv.profileImageUrl) ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials(selectedConv.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight">{selectedConv.name}</p>
                {(selectedConv.city || selectedConv.country) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {[selectedConv.city, selectedConv.country].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-4">
              {msgsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                      <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-56"}`} />
                    </div>
                  ))}
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-1">
                  {groupedMessages.map(({ date, msgs }) => (
                    <div key={date}>
                      {/* Date separator */}
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground font-medium px-1">{date}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="space-y-1">
                        {msgs.map((msg, i) => {
                          const isOwn = msg.senderUserId === (user as any)?.id;
                          const prevMsg = msgs[i - 1];
                          const nextMsg = msgs[i + 1];
                          const showAvatar = !isOwn && (!nextMsg || nextMsg.senderUserId !== msg.senderUserId);
                          const isGrouped = prevMsg && prevMsg.senderUserId === msg.senderUserId;
                          return (
                            <div
                              key={msg.id}
                              className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"} ${isGrouped ? "mt-0.5" : "mt-3"}`}
                              data-testid={`message-${msg.id}`}
                            >
                              {/* Avatar spacer for non-own messages */}
                              {!isOwn && (
                                <div className="w-7 flex-shrink-0">
                                  {showAvatar && (
                                    <Avatar className="h-7 w-7">
                                      <AvatarImage src={getMediaUrl(selectedConv.profileImageUrl) ?? undefined} />
                                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                        {getInitials(selectedConv.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                              )}
                              <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                                <div
                                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                    isOwn
                                      ? "bg-primary text-primary-foreground rounded-br-sm"
                                      : "bg-muted rounded-bl-sm"
                                  }`}
                                >
                                  {msg.content}
                                </div>
                                {/* Show timestamp for last in a group */}
                                {(!nextMsg || nextMsg.senderUserId !== msg.senderUserId) && (
                                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                    {timeLabel(msg.createdAt)}
                                    {isOwn && msg.isRead && <span className="ml-1 text-primary">✓✓</span>}
                                    {isOwn && !msg.isRead && <span className="ml-1">✓</span>}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Avatar className="h-16 w-16 mb-4">
                    <AvatarImage src={getMediaUrl(selectedConv.profileImageUrl) ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {getInitials(selectedConv.name)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold">{selectedConv.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send a message to start the conversation
                  </p>
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-background">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  placeholder={`Message ${selectedConv.name}...`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sendMutation.isPending}
                  className="flex-1"
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMutation.isPending}
                  size="icon"
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* No conversation selected — desktop placeholder */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="rounded-full bg-muted p-6 mb-4">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Your Messages</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Select a conversation from the list or start a new one with a community member.
            </p>
            <Button
              className="mt-6"
              onClick={() => setNewMsgOpen(true)}
              data-testid="button-start-conversation"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );
}
