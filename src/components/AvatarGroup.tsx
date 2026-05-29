import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface PresenceState {
  user_id: string;
  email: string;
  online_at: string;
}

export function AvatarGroup({ documentId }: { documentId: string }) {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<PresenceState[]>([]);

  useEffect(() => {
    if (!user || !documentId) return;

    const channel = supabase.channel(`presence:pipeline-${documentId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const users = Object.values(state)
          .flat()
          .filter((p) => p.user_id !== user.id); // Hide myself
        
        // Deduplicate by user_id
        const uniqueUsers = Array.from(new Map(users.map((u) => [u.user_id, u])).values());
        setActiveUsers(uniqueUsers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            email: user.email || "User",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [documentId, user]);

  if (activeUsers.length === 0) return null;

  return (
    <div className="flex items-center -space-x-2 ml-4">
      {activeUsers.map((p, i) => (
        <TooltipProvider key={p.user_id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  "h-8 w-8 border-2 border-background hover:z-10 relative cursor-pointer"
                )}
                style={{ zIndex: activeUsers.length - i }}
              >
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                  {p.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{p.email}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
