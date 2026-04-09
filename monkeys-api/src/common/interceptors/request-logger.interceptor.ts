import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

export interface RequestLoggerOptions {
  /** Log threshold in ms — requests faster than this use 'debug' level (default: 0, logs all at 'log') */
  slowThresholdMs?: number;
  /** Paths to skip entirely (e.g. health checks). Matched via startsWith. */
  excludePaths?: string[];
  /** Whether to log the authenticated user id (default: true) */
  logUserId?: boolean;
}

const DEFAULT_OPTIONS: Required<RequestLoggerOptions> = {
  slowThresholdMs: 1000,
  excludePaths: [],
  logUserId: true,
};

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly options: Required<RequestLoggerOptions>;

  constructor(options: RequestLoggerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = req;

    if (this.options.excludePaths.some((p) => originalUrl.startsWith(p))) {
      return next.handle();
    }

    const start = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Math.round(performance.now() - start);
          const res = context.switchToHttp().getResponse();
          const status: number = res.statusCode;
          this.emit(method, originalUrl, status, ms, req);
        },
        error: (err) => {
          const ms = Math.round(performance.now() - start);
          const status: number = err.status ?? err.statusCode ?? 500;
          this.emit(method, originalUrl, status, ms, req, err);
        },
      }),
    );
  }

  private emit(
    method: string,
    url: string,
    status: number,
    ms: number,
    req: Request,
    error?: any,
  ) {
    const userId = this.options.logUserId ? (req as any).user?.id : undefined;
    const userTag = userId ? ` user=${userId}` : '';
    const message = `${method} ${url} ${status} ${ms}ms${userTag}`;

    if (error) {
      this.logger.warn(`${message} err=${error.message ?? error}`);
    } else if (ms >= this.options.slowThresholdMs) {
      this.logger.warn(`${message} [SLOW]`);
    } else {
      this.logger.log(message);
    }
  }
}
