import { z } from "zod";
import type {components} from "./generated";

export const authenticationOptionsSchema = z.object({
  firebase: z.object({ apiKey: z.string(), authDomain: z.string(), projectId: z.string(), appId: z.string() }).nullable().optional(),
  registration_enabled: z.boolean(),
  email_delivery_enabled: z.boolean(),
  email_domains: z.array(z.string()),
});

export const userSchema = z.object({
  id: z.number(), name: z.string(), username: z.string().nullable(), verified: z.boolean(),
  bio: z.string().nullable(), location: z.string().nullable(), avatar_url: z.string().nullable(), cover_url: z.string().nullable(),
  links: z.array(z.string()), interests: z.array(z.string()), academic_visible: z.boolean(), private_account: z.boolean(),
  institution: z.object({id:z.number(),name:z.string(),slug:z.string()}).nullable(),
  faculty:z.string().nullable(), department:z.string().nullable(), cohort:z.number().nullable(),
  affiliation:z.object({faculty_id:z.number().nullable(),department_id:z.number().nullable(),academic_cohort_id:z.number().nullable()}).nullable(),
  email:z.string().optional(),email_verified:z.boolean().optional(),verification_state:z.enum(["pending","approved","rejected","suspended"]).optional(),
  onboarded:z.boolean().optional(),can_review_verifications:z.boolean().optional(),can_moderate:z.boolean().optional(),
}) satisfies z.ZodType<components["schemas"]["User"]>;
export type User = components["schemas"]["User"];
export const registrationSchema = z.object({name:z.string().min(1,"Isi nama Anda").max(80),username:z.string().regex(/^[a-z0-9_]{3,24}$/, "Gunakan 3–24 huruf kecil, angka, atau underscore"),email:z.email("Email tidak valid"),password:z.string().min(12,"Minimal 12 karakter").regex(/[a-z]/,"Tambahkan huruf kecil").regex(/[A-Z]/,"Tambahkan huruf besar").regex(/[0-9]/,"Tambahkan angka"),password_confirmation:z.string()}).refine(d=>d.password===d.password_confirmation,{path:["password_confirmation"],message:"Kata sandi belum sama"});
export const loginSchema=z.object({email:z.email("Email tidak valid"),password:z.string().min(1,"Isi kata sandi")});
export function authFormSchema(mode:"login"|"register") {
  return loginSchema.extend({name:z.string().optional(),username:z.string().optional(),password_confirmation:z.string().optional()}).superRefine((data,ctx)=>{
    if(mode!=="register")return;
    const result=registrationSchema.safeParse(data);
    if(!result.success)for(const issue of result.error.issues)ctx.addIssue({code:"custom",path:issue.path,message:issue.message});
  });
}
