import { PipeTransform, BadRequestException } from '@nestjs/common';
import type { ZodType } from 'zod';
import type { ApiErrorDetail } from '@ssa/shared';


export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const details: ApiErrorDetail[] = result.error.issues.map((issue) => ({
        field:   issue.path.length > 0 ? issue.path.join('.') : 'value',
        message: issue.message,
      }));

      throw new BadRequestException({
        message: 'Validation failed',
        error:   'Bad Request',
        details,
      });
    }

    return result.data;
  }
}
