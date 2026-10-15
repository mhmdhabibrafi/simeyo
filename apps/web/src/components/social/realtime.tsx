"use client";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Pusher from "pusher-js";
import { api } from "@/lib/api";
type Configuration = {
  enabled: boolean;
  key: string | null;
  host: string | null;
  port: number;
  scheme: string;
};
export function Realtime({ userId }: { userId: number }) {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["realtime"],
    queryFn: () => api<{ data: Configuration }>("realtime"),
  });
  useEffect(() => {
    const c = q.data?.data;
    if (!c?.enabled || !c.key || !c.host) return;
    const socket = new Pusher(c.key, {
      cluster: "ruang",
      wsHost: c.host,
      wsPort: c.port,
      wssPort: c.port,
      forceTLS: c.scheme === "https",
      enabledTransports: ["ws", "wss"],
      disableStats: true,
      channelAuthorization: {
        customHandler: (params, callback) => {
          api<{ auth: string }>("broadcasting/auth", {
            method: "POST",
            body: JSON.stringify({
              socket_id: params.socketId,
              channel_name: params.channelName,
            }),
          })
            .then((data) => callback(null, data))
            .catch((error) => callback(error, null));
        },
      },
    });
    const refresh = () => {
      client.invalidateQueries({ queryKey: ["notifications"] });
      client.invalidateQueries({ queryKey: ["conversations"] });
      client.invalidateQueries({ queryKey: ["messages"] });
    };
    socket
      .subscribe(`private-App.Models.User.${userId}`)
      .bind("activity.changed", refresh);
    socket.connection.bind("connected", refresh);
    return () => socket.disconnect();
  }, [q.data, userId, client]);
  return null;
}
