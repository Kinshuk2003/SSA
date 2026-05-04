import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiError, ApiErrorDetail } from '@ssa/shared';


@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode        = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let error: string;
      let message: string;
      let details: ApiErrorDetail[] | undefined;

      if (typeof exceptionResponse === 'string') {
        error   = exceptionResponse;
        message = exceptionResponse;
      } else {
        const body  = exceptionResponse as Record<string, unknown>;
        error       = (body['error']   as string | undefined) ?? 'Error';
        const raw   = body['message'];
        message     = Array.isArray(raw) ? raw.join(', ') : (raw as string | undefined) ?? 'An error occurred';
        details     = body['details'] as ApiErrorDetail[] | undefined;
      }

      const body: ApiError = {
        statusCode,
        error,
        message,
        ...(details !== undefined ? { details } : {}),
      };

      response.status(statusCode).json(body);
    } else {
      // Unknown error — log server-side, return opaque 500 to client.
      console.error('[AllExceptionsFilter] Unexpected error:', exception);

      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error:      'Internal Server Error',
        message:    'An unexpected error occurred',
      } satisfies ApiError);
    }
  }
}
