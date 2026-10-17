import { z } from "zod";
import type { User } from "../../../../packages/api-contracts/src";
const prefix = "simeyo-profile-draft:";
const schema = z.object({
  name: z.string().max(80),
  username: z.string().max(24),
  bio: z.string().max(500),
  location: z.string().max(80),
  links: z.string().max(1280),
  interests: z.string().max(410),
  academic_visible: z.boolean(),
  private_account: z.boolean(),
});
export type ProfileValues = z.infer<typeof schema>;
export function profileValues(user: User): ProfileValues {
  return {
    name: user.name,
    username: user.username ?? "",
    bio: user.bio ?? "",
    location: user.location ?? "",
    links: user.links.join("\n"),
    interests: user.interests.join(", "),
    academic_visible: user.academic_visible,
    private_account: user.private_account,
  };
}
export function readProfileDraft(id: number): ProfileValues | null {
  try {
    const key = prefix + id;
    const item = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (
      item &&
      typeof item.at === "number" &&
      item.at <= Date.now() &&
      Date.now() - item.at < 86400000
    ) {
      const parsed = schema.safeParse(item.values);
      if (parsed.success) return parsed.data;
    }
    sessionStorage.removeItem(key);
  } catch {
    /* Editing works without browser storage. */
  }
  return null;
}
export function saveProfileDraft(id: number, values: ProfileValues) {
  try {
    sessionStorage.setItem(
      prefix + id,
      JSON.stringify({ at: Date.now(), values }),
    );
    return true;
  } catch {
    return false;
  }
}
export function clearProfileDraft(id?: number) {
  try {
    if (id !== undefined) sessionStorage.removeItem(prefix + id);
    else
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith(prefix))
        .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    /* Saving and logout still work when storage is disabled. */
  }
}
