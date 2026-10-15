export function notificationTarget(
  data: Record<string, unknown> | undefined,
  userId: number,
  lastOpenedId: string | null = null,
): string | null {
  if (
    !data ||
    data.user_id !== userId ||
    typeof data.notification_id !== "string" ||
    data.notification_id === lastOpenedId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      data.notification_id,
    )
  )
    return null;
  return data.notification_id;
}
