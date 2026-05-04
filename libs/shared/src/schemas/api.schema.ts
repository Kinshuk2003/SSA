import { z } from 'zod';

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data:       z.array(itemSchema),
    nextCursor: z.string().nullable(),
    total:      z.number().int().nonnegative(),
    page_size:  z.number().int().positive(),
  });

export interface PaginatedResponse<T> {
  data:       T[];
  nextCursor: string | null;
  total:      number;
  page_size:  number;
}


export const ApiErrorDetailSchema = z.object({
  field:   z.string(),
  message: z.string(),
});

export const ApiErrorSchema = z.object({
  statusCode: z.number().int().min(400).max(599),
  error:      z.string(),
  message:    z.string(),
  details:    z.array(ApiErrorDetailSchema).optional(),
});

export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;
export type ApiError       = z.infer<typeof ApiErrorSchema>;
