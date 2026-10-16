import {z} from 'zod';
export const topicSearchSchema=z.object({data:z.array(z.object({name:z.string(),posts_count:z.number().int().nonnegative()})),next_cursor:z.string().nullable()});
export const communitySchema=z.object({id:z.number().int(),name:z.string(),description:z.string(),rules:z.string().nullable(),visibility:z.enum(['campus','private']),faculty_id:z.number().int().nullable(),department_id:z.number().int().nullable(),owner_id:z.number().int(),organization_verified:z.boolean(),members_count:z.number().int(),membership:z.object({role:z.enum(['owner','moderator','member']),state:z.enum(['active','pending'])}).passthrough().nullable()});
export const eventSchema=z.object({id:z.number().int(),title:z.string(),description:z.string(),location:z.string(),starts_at:z.string(),ends_at:z.string(),user_id:z.number().int(),community_id:z.number().int().nullable(),going_count:z.number().int(),rsvp:z.enum(['going','interested']).nullable()});
export type Community=z.infer<typeof communitySchema>;
export type CampusEvent=z.infer<typeof eventSchema>;
