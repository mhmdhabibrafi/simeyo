import { useEffect } from "react";
import { Platform } from "react-native";
import { router, useRootNavigationState } from "expo-router";
import * as Notifications from "expo-notifications";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../lib/providers";
import { notificationTarget } from "../lib/notification-target";
type Config = {
  enabled: boolean;
  key: string | null;
  host: string | null;
  port: number;
  scheme: string;
  origin: string;
};
export function NativeActivity() {
  const { api, token, user, origin } = useSession();
  const client = useQueryClient();
  const navigation = useRootNavigationState();
  const q = useQuery({
    queryKey: ["realtime"],
    enabled: !!token && !!user?.verified,
    queryFn: () => api<{ data: Config }>("realtime"),
  });
  useEffect(() => {
    const config = q.data?.data;
    if (
      !token ||
      !user?.verified ||
      !config?.enabled ||
      !config.key ||
      !config.host
    )
      return;
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      for (const key of ["notifications", "conversations", "messages"])
        void client.invalidateQueries({ queryKey: [key] });
    };
    const connect = () => {
      if (disposed) return;
      const host = ["localhost", "127.0.0.1"].includes(config.host!)
        ? new URL(origin).hostname
        : config.host;
      const address = `${config.scheme === "https" ? "wss" : "ws"}://${host}:${config.port}/app/${encodeURIComponent(config.key!)}?protocol=7&client=simeyo-native&version=0.4.0`;
      const NativeSocket = WebSocket as unknown as new (
        address: string,
        protocols: undefined,
        options: { headers: Record<string, string> },
      ) => WebSocket;
      socket =
        Platform.OS === "web"
          ? new WebSocket(address)
          : new NativeSocket(address, undefined, {
              headers: { Origin: config.origin },
            });
      socket.onmessage = (event) => {
        void (async () => {
          const packet = JSON.parse(String(event.data));
          if (packet.event === "pusher:connection_established") {
            const data =
              typeof packet.data === "string"
                ? JSON.parse(packet.data)
                : packet.data;
            const channel = `private-App.Models.User.${user.id}`;
            const auth = await api<{ auth: string }>("broadcasting/auth", {
              method: "POST",
              body: JSON.stringify({
                socket_id: data.socket_id,
                channel_name: channel,
              }),
            });
            if (!disposed && socket?.readyState === WebSocket.OPEN)
              socket.send(
                JSON.stringify({
                  event: "pusher:subscribe",
                  data: { channel, auth: auth.auth },
                }),
              );
          } else if (packet.event === "pusher:ping")
            socket?.send(JSON.stringify({ event: "pusher:pong", data: {} }));
          else if (packet.event === "activity.changed") refresh();
        })().catch(() => socket?.close());
      };
      socket.onclose = () => {
        if (!disposed) reconnect = setTimeout(connect, 5000);
      };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => {
      disposed = true;
      if (reconnect) clearTimeout(reconnect);
      socket?.close();
    };
  }, [q.data, token, user?.id, user?.verified, origin, api, client]);
  useEffect(() => {
    if (Platform.OS === "web" || !token || !user || !navigation?.key) return;
    const open = (response: Notifications.NotificationResponse) => {
      const target = notificationTarget(
        response.notification.request.content.data,
        user.id,
      );
      if (target) {
        void client.invalidateQueries({ queryKey: ["notifications"] });
        router.push("/activity");
      }
    };
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const matches = !!notificationTarget(
          notification.request.content.data,
          user.id,
        );
        return {
          shouldShowBanner: matches,
          shouldShowList: matches,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      },
    });
    const received = Notifications.addNotificationReceivedListener(
      () => void client.invalidateQueries({ queryKey: ["notifications"] }),
    );
    const tapped = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) open(response);
      })
      .catch(() => {});
    return () => {
      received.remove();
      tapped.remove();
      Notifications.setNotificationHandler(null);
    };
  }, [token, user, navigation?.key, client]);
  return null;
}
