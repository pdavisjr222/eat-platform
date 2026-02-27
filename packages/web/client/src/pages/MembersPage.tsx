import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, MessageSquare } from "lucide-react";
import type { User } from "@shared/schema";
import { useLocation } from "wouter";

export default function MembersPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: members, isLoading } = useQuery<{ data: User[]; pagination: any }, Error, User[]>({
    queryKey: ["/api/members"],
    select: (res) => res.data,
  });

  const filteredMembers = members?.filter((member) => {
    return (
      !searchQuery ||
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.country?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
          Community Members
        </h1>
        <p className="text-muted-foreground">
          Connect with like-minded nature lovers, gardeners, and farmers
        </p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members by name, location, or interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-members"
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredMembers && filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMembers.map((member) => (
            <Card
              key={member.id}
              className="p-6 hover-elevate cursor-pointer"
              onClick={() => setLocation(`/members/${member.id}`)}
              data-testid={`card-member-${member.id}`}
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={member.profileImageUrl || undefined} alt={member.name} />
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1">{member.name}</h3>
                  {(member.city || member.country) && (
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3 mr-1" />
                      {[member.city, member.country].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {member.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {member.bio}
                    </p>
                  )}
                  {member.interests && member.interests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {member.interests.slice(0, 3).map((interest, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                      {member.interests.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.interests.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/messages?user=${member.id}`);
                    }}
                    data-testid={`button-message-${member.id}`}
                  >
                    <MessageSquare className="h-3 w-3 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            No members found matching your search
          </div>
        </Card>
      )}
    </div>
  );
}
