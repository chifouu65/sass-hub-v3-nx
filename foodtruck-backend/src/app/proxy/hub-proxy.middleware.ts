import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

/**
 * Proxifie les requêtes /hub-api/* vers le hub-backend.
 * En dev : proxy vers http://localhost:4301/api (via Angular dev server)
 * En prod : proxy vers HUB_API_URL (Railway service hub-backend)
 */
@Injectable()
export class HubProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HubProxyMiddleware.name);
  private readonly hubUrl =
    process.env['HUB_API_URL'] ?? 'http://localhost:4301/api';

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Strip /hub-api prefix, forward the rest to hub-backend
    const path = req.originalUrl.replace(/^\/hub-api/, '');
    const targetUrl = `${this.hubUrl}${path}`;

    this.logger.debug(`Proxy → ${req.method} ${targetUrl}`);

    try {
      // Forward all headers except host & content-length (axios recomputes them)
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (
          key.toLowerCase() !== 'host' &&
          key.toLowerCase() !== 'content-length'
        ) {
          headers[key] = Array.isArray(value) ? value.join(', ') : (value ?? '');
        }
      }

      const axiosRes = await axios({
        method: req.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        url: targetUrl,
        headers,
        data: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
        validateStatus: () => true, // forward tous les codes HTTP
        responseType: 'arraybuffer', // préserve encoding binaire
        maxRedirects: 0,
      });

      // Forward response headers (Set-Cookie inclus)
      for (const [key, value] of Object.entries(axiosRes.headers)) {
        if (key.toLowerCase() === 'transfer-encoding') continue;
        if (value !== undefined) {
          res.setHeader(key, value as string | string[]);
        }
      }

      res.status(axiosRes.status).send(axiosRes.data);
    } catch (err) {
      this.logger.error(`Hub proxy error: ${(err as Error).message}`);
      next(err);
    }
  }
}
