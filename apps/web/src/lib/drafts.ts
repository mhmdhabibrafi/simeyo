const PREFIX = "simeyo:draft:";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function draftKey(userId: number, context = "new") {
  return `${PREFIX}${userId}:${context}`;
}

export function readDraft(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      value &&
      typeof value.body === "string" &&
      value.body.length <= 1000 &&
      ["campus", "followers"].includes(value.visibility) &&
      typeof value.savedAt === "number" &&
      Date.now() - value.savedAt < MAX_AGE &&
      value.savedAt <= Date.now()
    ) {
      return {
        body: value.body as string,
        visibility: value.visibility as "campus" | "followers",
        request:
          value.request &&
          typeof value.request.payload === "string" &&
          value.request.payload.length <= 100000 &&
          typeof value.request.id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.request.id)
            ? {
                payload: value.request.payload as string,
                id: value.request.id as string,
              }
            : null,
      };
    }
    localStorage.removeItem(key);
  } catch {
    /* Storage may be disabled by the browser. */
  }
  return null;
}

export function saveDraft(
  key: string,
  body: string,
  visibility: "campus" | "followers",
  request?: { payload: string; id: string },
) {
  try {
    if (body.trim())
      localStorage.setItem(
        key,
        JSON.stringify({ body, visibility, savedAt: Date.now(), request }),
      );
    else localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(key?: string) {
  try {
    if (key) localStorage.removeItem(key);
    else
      Object.keys(localStorage)
        .filter((name) => name.startsWith(PREFIX))
        .forEach((name) => localStorage.removeItem(name));
  } catch {
    /* Logout and successful posts must work without storage. */
  }
}
