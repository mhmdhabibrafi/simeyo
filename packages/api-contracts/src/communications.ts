import { z } from 'zod';
const person = z.object({ id: z.number().int(), name: z.string(), username: z.string() });
export const messageSchema = z.object({ id: z.number().int(), conversation_id: z.number().int(), sender_id: z.number().int(), client_id: z.string().uuid(), body: z.string(), created_at: z.string() });
export const conversationsSchema = z.object({ data: z.array(z.object({ id: z.number().int(), user: person, unread_count: z.number().int(), last_message: z.object({ sender_id: z.number().int(), body: z.string(), created_at: z.string() }).nullable().optional().default(null) })), next_cursor: z.string().nullable() });
export const messagesSchema = z.object({ data: z.array(messageSchema), user: person, next_cursor: z.string().nullable(), can_send: z.boolean() });
export const notificationsSchema = z.object({ data: z.array(z.object({ id: z.string().uuid(), kind: z.string(), actor: person, post_id: z.number().int().nullable(), conversation_id: z.number().int().nullable(), message: z.string().nullable().optional(), read_at: z.string().nullable(), created_at: z.string() })), next_cursor: z.string().nullable(), unread_count: z.number().int() });
export const communicationPreferencesSchema = z.object({ dm_policy: z.enum(['campus','followers','nobody']), notification_preferences: z.record(z.string(), z.boolean()).nullable() });
