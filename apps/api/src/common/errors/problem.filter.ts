import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ProblemDetails } from '@workshop/shared';

/**
 * Maps all errors to RFC 9457 problem+json (API convention, PRD §8 / Architecture §8).
 * Never leaks internal details for 5xx.
 */
@Catch()
export class ProblemExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = 500;
    let title = 'Internal Server Error';
    let detail: string | undefined;
    let errors: ProblemDetails['errors'];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        title = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        title = (b.error as string) ?? exception.name;
        detail = Array.isArray(b.message) ? undefined : (b.message as string);
        if (Array.isArray(b.message)) {
          errors = (b.message as string[]).map((m) => ({ field: '', message: m }));
        }
      }
    } else {
      this.logger.error('Unhandled exception', exception as Error);
    }

    const problem: ProblemDetails = {
      type: `https://errors.workshop-os.eu/${status}`,
      title,
      status,
      detail,
      instance: req.originalUrl,
      errors,
    };
    res.status(status).type('application/problem+json').json(problem);
  }
}
