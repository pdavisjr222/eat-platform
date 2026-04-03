import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, ShieldOff, ShieldCheck, Trash2, Users, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  isBanned: boolean;
  bannedReason?: string;
  emailVerified: boolean;
  country?: string;
  createdAt: string;
  profileImageUrl?: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    type: "ban" | "unban" | "delete";
    member: Member;
  } | null>(null);

  // Redirect non-admins
  if (user && (user as any).role !== "admin") {
    setLocation("/");
    return null;
  }

  const { data: members, isLoading } = useQuery<{ data: Member[] }, Error, Member[]>({
    queryKey: ["/api/members"],
    select: (res) => res.data,
  });

  const banMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${id}/ban`, { reason });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Member banned" });
      setConfirmAction(null);
    },
    onError: () => toast({ title: "Failed to ban member", variant: "destructive" }),
  });

  const unbanMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${id}/unban`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Member unbanned" });
      setConfirmAction(null);
    },
    onError: () => toast({ title: "Failed to unban member", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Member deleted" });
      setConfirmAction(null);
    },
    onError: () => toast({ title: "Failed to delete member", variant: "destructive" }),
  });

  const filtered = members?.filter((m) =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalMembers = members?.length ?? 0;
  const bannedCount = members?.filter((m) => m.isBanned).length ?? 0;
  const adminCount = members?.filter((m) => m.role === "admin").length ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage members and platform access</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card/80">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalMembers}</p>
              <p className="text-xs text-muted-foreground">Total Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{bannedCount}</p>
              <p className="text-xs text-muted-foreground">Banned</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{adminCount}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Members ({filtered?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No members found</p>
          ) : (
            <div className="divide-y">
              {filtered?.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={member.profileImageUrl} />
                      <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-base truncate">{member.name}</p>
                        {member.role === "admin" && (
                          <Badge variant="default" className="text-xs">Admin</Badge>
                        )}
                        {member.isBanned && (
                          <Badge variant="destructive" className="text-xs">Banned</Badge>
                        )}
                        {!member.emailVerified && (
                          <Badge variant="outline" className="text-xs">Unverified</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Don't show actions for self or other admins */}
                  {member.id !== (user as any)?.id && member.role !== "admin" && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {member.isBanned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmAction({ type: "unban", member })}
                        >
                          <ShieldCheck className="h-4 w-4 mr-1" />
                          Unban
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          onClick={() => setConfirmAction({ type: "ban", member })}
                        >
                          <ShieldOff className="h-4 w-4 mr-1" />
                          Ban
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/20 hover:bg-destructive/10"
                        onClick={() => setConfirmAction({ type: "delete", member })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "ban" && "Ban Member"}
              {confirmAction?.type === "unban" && "Unban Member"}
              {confirmAction?.type === "delete" && "Delete Member"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "ban" &&
                `Are you sure you want to ban ${confirmAction.member.name}? They will not be able to log in.`}
              {confirmAction?.type === "unban" &&
                `Are you sure you want to unban ${confirmAction.member.name}? They will be able to log in again.`}
              {confirmAction?.type === "delete" &&
                `Are you sure you want to permanently delete ${confirmAction.member.name}? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.type === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === "ban") {
                  banMutation.mutate({ id: confirmAction.member.id, reason: "Banned by admin" });
                } else if (confirmAction.type === "unban") {
                  unbanMutation.mutate(confirmAction.member.id);
                } else if (confirmAction.type === "delete") {
                  deleteMutation.mutate(confirmAction.member.id);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
