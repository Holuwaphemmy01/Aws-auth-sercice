import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const safeParseRegister = (data: unknown) => RegisterSchema.parse(data);
export const safeParseLogin = (data: unknown) => LoginSchema.parse(data);
