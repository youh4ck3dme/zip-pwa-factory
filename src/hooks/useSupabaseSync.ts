import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { db, type LocalPipeline } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";

export function useSupabaseSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Listen to changes on the pipelines table
    const channel = supabase
      .channel("public:pipelines")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pipelines" },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === "DELETE") {
            await db.pipelines.delete(oldRecord.id as string);
            return;
          }

          if (eventType === "INSERT" || eventType === "UPDATE") {
            const serverPipeline = newRecord as LocalPipeline;

            // Conflict resolution: Last writer wins based on updated_at
            const localRecord = await db.pipelines.get(serverPipeline.id);

            if (localRecord) {
              const localTime = new Date(localRecord.updated_at).getTime();
              const serverTime = new Date(serverPipeline.updated_at).getTime();

              if (serverTime >= localTime) {
                // Server is newer or same, update local DB
                await db.pipelines.put(serverPipeline);
              } else {
                // Local is newer. In a full offline-first setup, we would push local to server here.
                console.log(`Conflict: Local pipeline ${serverPipeline.id} is newer. Keeping local.`);
              }
            } else {
              // No local record, just insert
              await db.pipelines.put(serverPipeline);
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("Supabase Sync: Connected to pipelines changes");
        } else if (status === "CHANNEL_ERROR") {
          console.error("Supabase Sync Error:", err);
        }
      });

    return () => {
      // Cleanup: leave channel to avoid memory leaks
      supabase.removeChannel(channel);
      console.log("Supabase Sync: Channel removed");
    };
  }, [user]);
}
