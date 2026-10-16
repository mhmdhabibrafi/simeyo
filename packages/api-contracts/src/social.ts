import {z} from 'zod';
export const mediaSchema=z.object({id:z.number(),url:z.string(),width:z.number(),height:z.number()});
export const postSchema=z.object({
 id:z.number(),body:z.string(),visibility:z.enum(['campus','followers']),parent_id:z.number().nullable(),root_id:z.number().nullable(),depth:z.number(),quote_id:z.number().nullable(),created_at:z.string(),edited_at:z.string().nullable(),
 author:z.object({id:z.number(),name:z.string(),username:z.string().nullable(),verified:z.boolean(),avatar_url:z.string().nullable(),department:z.string().nullable()}),media:z.array(mediaSchema),
 quote:z.object({id:z.number(),body:z.string(),author:z.object({name:z.string(),username:z.string().nullable()}),media:z.array(mediaSchema)}).nullable(),
 likes_count:z.number(),reposts_count:z.number(),replies_count:z.number(),liked:z.boolean(),reposted:z.boolean(),bookmarked:z.boolean(),can_edit:z.boolean(),reposted_by:z.string().nullable().optional(),
});
export const feedSchema=z.object({data:z.array(postSchema),meta:z.object({next_cursor:z.string().nullable(),has_more:z.boolean(),feed:z.string(),ranking:z.string().optional()})});
export const relationshipSchema=z.object({followers_count:z.number(),following_count:z.number(),follow_state:z.enum(['pending','accepted']).nullable(),muted:z.boolean()});
export type Post=z.infer<typeof postSchema>;
export type FeedPage=z.infer<typeof feedSchema>;
export type Media=z.infer<typeof mediaSchema>;
export type Relationship=z.infer<typeof relationshipSchema>;

export const feedPreferencesSchema = z.object({data:z.object({hidden_count:z.number().int().nonnegative(),reduced_authors_count:z.number().int().nonnegative()})});
