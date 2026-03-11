import { z } from 'zod';

/** Validates the address query param for GET /api/auth/nonce */
export const nonceQuerySchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address'),
});

/** Validates the body for POST /api/auth/login */
export const loginBodySchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address'),
  signature: z
    .string()
    .min(1, 'Signature is required'),
  message: z
    .string()
    .min(1, 'Message is required'),
});

/** Validates the body for PUT /api/user/profile */
export const updateProfileBodySchema = z.object({
  nickname: z
    .string()
    .min(3, 'Nickname must be at least 3 characters')
    .max(20, 'Nickname must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, underscores, and hyphens')
    .nullable()
    .optional(),
  displayPreference: z
    .enum(['nickname', 'address'])
    .optional(),
});