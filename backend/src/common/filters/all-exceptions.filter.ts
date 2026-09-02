import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Log every non-4xx error so it appears in Render logs
    if (status >= 500) {
      Sentry.captureException(exception);
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `${request.method} ${request.url} → ${status}: ${err.message}`,
        err.stack,
      );
    }

    // 401s are silent everywhere else (no Render HTTP access-logs on this plan),
    // which let a StroWallet webhook secret mismatch go unnoticed for 2 months.
    // Surface these routes' 401s at warn level without making 401s noisy app-wide.
    // request.path (not request.url) is used deliberately — url would include the
    // raw ?secret=... query string and leak it into Render logs on every rejection.
    // Covers ALL /v1/webhooks/* routes (StroWallet, BSICards, any future one) —
    // same secret-in-query-string pattern, same leak risk.
    if (status === HttpStatus.UNAUTHORIZED && request.path?.startsWith('/v1/webhooks/')) {
      this.logger.warn(`[Webhook] 401 rejected — ${request.method} ${request.path}: ${message}`);
    }

    response.status(status).json({ statusCode: status, message });
  }
}
