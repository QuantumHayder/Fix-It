import { z } from "zod";

export const LoginRequestSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});

const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;

export const RegisterRequestSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(50),
  lastName: z.string().trim().min(1, "Enter your last name.").max(50),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.-]{3,30}$/, "Username: 3-30 characters, letters, digits, _ . or -"),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .refine((v) => utf8Bytes(v) <= 72, "Password must be at most 72 bytes."),
});

// Convert names once, at the API boundary.
export const UserInfoSchema = z
  .object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    username: z.string(),
    email: z.email(),
    joined_at: z.string(),
  })
  .transform((u) => ({
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    fullName: `${u.first_name} ${u.last_name}`,
    username: u.username,
    email: u.email,
    joinedAt: u.joined_at,
  }));

export const LoginResponseSchema = z
  .object({
    access_token: z.string().trim().min(1),
    token_type: z.string().refine((v) => v.toLowerCase() === "bearer"),
    user: UserInfoSchema.optional(),
  })
  .transform((r) => ({
    accessToken: r.access_token,
    tokenType: "bearer" as const,
    user: r.user ?? null,
  }));

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type UserInfo = z.infer<typeof UserInfoSchema>;