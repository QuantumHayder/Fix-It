import { z } from "zod";

// The backend normalizes the URL again, this is only a quick check for the user.
export const CreateWebsiteRequestSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Enter the website URL.")
    .max(2048)
    .refine((v) => v.startsWith("http://") || v.startsWith("https://"), "URL must start with http:// or https://"),
  displayName: z.string().trim().max(100, "Name must be at most 100 characters.").optional(),
});

export const UpdateWebsiteRequestSchema = z.object({
  displayName: z.string().trim().max(100, "Name must be at most 100 characters."),
});

// Same idea as UserInfoSchema: convert snake_case to camelCase once, here.
export const WebsiteSchema = z
  .object({
    id: z.number(),
    url: z.string(),
    display_name: z.string().nullable(),
    created_at: z.string(),
  })
  .transform((w) => ({
    id: w.id,
    url: w.url,
    displayName: w.display_name,
    // what we show in the UI: the friendly name if there is one, otherwise the URL
    label: w.display_name ?? w.url,
    createdAt: w.created_at,
  }));

export const WebsiteListSchema = z.array(WebsiteSchema);

export type CreateWebsiteRequest = z.input<typeof CreateWebsiteRequestSchema>;
export type UpdateWebsiteRequest = z.input<typeof UpdateWebsiteRequestSchema>;
export type Website = z.infer<typeof WebsiteSchema>;
