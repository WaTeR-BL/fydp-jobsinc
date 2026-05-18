import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dns from 'dns';
import { promisify } from 'util';
import { UrlVerificationResponse } from './interface/verification.interface';
import { RedisService } from '@app/common/redis/redis.service';

@Injectable()
export class UrlVerificationService {
    private readonly dnsResolve = promisify(dns.resolve);
    private readonly URL_PATTERN =
        /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    private readonly CACHE_TTL = 3600;
    private readonly REQUEST_TIMEOUT = 10000;

    constructor(
        private config: ConfigService,
        private readonly redisService: RedisService,
    ) {}

    async verify(
        url: string,
    ): Promise<[string, boolean, UrlVerificationResponse]> {
        try {
            if (!this.isValidUrlFormat(url)) {
                const result =
                    this.createInvalidUrlResponse('Invalid URL format');
                await this.cacheResult(url, result);
                return ['Invalid URL format', true, result];
            }

            const cachedResult = await this.getCachedResult(url);
            if (cachedResult) {
                return ['Success', true, cachedResult];
            }

            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            const [hasValidDns, reachabilityCheck] = await Promise.all([
                this.checkDns(domain),
                this.checkReachability(url),
            ]);

            const hasValidSsl =
                urlObj.protocol === 'https:'
                    ? reachabilityCheck.hasValidSsl
                    : true;

            const reliabilityScore = this.calculateReliabilityScore({
                hasValidDns,
                isReachable: reachabilityCheck.isReachable,
                hasValidSsl,
                statusCode: reachabilityCheck.statusCode,
                protocol: urlObj.protocol,
            });

            const finalVerdict = this.determineFinalVerdict({
                hasValidDns,
                isReachable: reachabilityCheck.isReachable,
                hasValidSsl,
                reliabilityScore,
                protocol: urlObj.protocol,
            });

            const result: UrlVerificationResponse = {
                valid: finalVerdict.isValid,
                result: finalVerdict.result,
                isReachable: reachabilityCheck.isReachable,
                hasValidDns,
                hasValidSsl,
                reliabilityScore,
                statusCode: reachabilityCheck.statusCode,
                domain,
                reason: finalVerdict.isValid ? null : finalVerdict.reason,
            };

            await this.cacheResult(url, result);

            return ['Success', true, result];
        } catch (error) {
            const errorMessage = error?.message || 'Unknown error occurred';
            return [errorMessage, false, null];
        }
    }

    async getCachedUrlVerification(
        url: string,
    ): Promise<[string, boolean, UrlVerificationResponse]> {
        try {
            if (!this.isValidUrlFormat(url)) {
                return ['Invalid URL format', false, null];
            }

            const cachedResult = await this.getCachedResult(url);

            if (!cachedResult) {
                return ['No verification found for this URL', false, null];
            }

            return ['Success', true, cachedResult];
        } catch (error) {
            const errorMessage =
                error?.message || 'Error retrieving verification';
            return [errorMessage, false, null];
        }
    }

    private isValidUrlFormat(url: string): boolean {
        if (!url || typeof url !== 'string') {
            return false;
        }
        return this.URL_PATTERN.test(url);
    }

    private async getCachedResult(
        url: string,
    ): Promise<UrlVerificationResponse | null> {
        try {
            const key = this.getCacheKey(url);
            const cached = await this.redisService.get(key);

            if (!cached) {
                return null;
            }

            return JSON.parse(cached) as UrlVerificationResponse;
        } catch (error) {
            console.error('Error retrieving cached result:', error?.message);
            return null;
        }
    }

    private async cacheResult(
        url: string,
        result: UrlVerificationResponse,
    ): Promise<void> {
        try {
            const key = this.getCacheKey(url);
            await this.redisService.write(
                key,
                JSON.stringify(result),
                this.CACHE_TTL,
            );
        } catch (error) {
            console.error('Error caching result:', error?.message);
        }
    }

    private getCacheKey(url: string): string {
        return `url_verification_${url}`;
    }

    private createInvalidUrlResponse(reason: string): UrlVerificationResponse {
        return {
            valid: false,
            result: 'INVALID',
            isReachable: false,
            hasValidDns: false,
            hasValidSsl: false,
            reliabilityScore: 0,
            domain: '',
            reason,
        };
    }

    private async checkDns(domain: string): Promise<boolean> {
        try {
            if (!domain) {
                return false;
            }
            await this.dnsResolve(domain);
            return true;
        } catch {
            return false;
        }
    }

    private async checkReachability(url: string): Promise<{
        isReachable: boolean;
        statusCode?: number;
        hasValidSsl: boolean;
    }> {
        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            this.REQUEST_TIMEOUT,
        );

        try {
            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                redirect: 'follow',
            });

            clearTimeout(timeout);

            return {
                isReachable: response.ok || response.status < 500,
                statusCode: response.status,
                hasValidSsl: true,
            };
        } catch (error) {
            clearTimeout(timeout);

            // Handle timeout
            if (error.name === 'AbortError') {
                return {
                    isReachable: false,
                    statusCode: 408,
                    hasValidSsl: false,
                };
            }

            // Handle SSL/TLS errors
            const errorMessage = error?.message || '';
            if (
                errorMessage.includes('certificate') ||
                errorMessage.includes('SSL') ||
                errorMessage.includes('TLS')
            ) {
                return {
                    isReachable: false,
                    hasValidSsl: false,
                };
            }

            // Handle other network errors
            return {
                isReachable: false,
                hasValidSsl: false,
            };
        }
    }

    private calculateReliabilityScore(params: {
        hasValidDns: boolean;
        isReachable: boolean;
        hasValidSsl: boolean;
        statusCode?: number;
        protocol: string;
    }): number {
        let score = 0;

        // DNS validity (30 points)
        if (params.hasValidDns) {
            score += 30;
        }

        // Reachability (40-50 points)
        if (params.isReachable) {
            score += 40;

            // Bonus for good status codes
            if (params.statusCode >= 200 && params.statusCode < 300) {
                score += 10;
            } else if (params.statusCode >= 300 && params.statusCode < 400) {
                score += 5;
            }
        }

        // SSL/Protocol (10-20 points)
        if (params.protocol === 'https:') {
            if (params.hasValidSsl) {
                score += 20;
            }
        } else {
            // HTTP gets partial credit
            score += 10;
        }

        return Math.min(100, Math.max(0, score));
    }

    private determineFinalVerdict(params: {
        hasValidDns: boolean;
        isReachable: boolean;
        hasValidSsl: boolean;
        reliabilityScore: number;
        protocol: string;
    }): { isValid: boolean; result: string; reason?: string } {
        if (!params.hasValidDns) {
            return {
                isValid: false,
                result: 'INVALID',
                reason: 'Domain does not have valid DNS records',
            };
        }

        if (!params.isReachable) {
            return {
                isValid: false,
                result: 'INVALID',
                reason: 'URL is not reachable or server is down',
            };
        }

        if (params.protocol === 'https:' && !params.hasValidSsl) {
            return {
                isValid: false,
                result: 'INVALID',
                reason: 'Invalid or expired SSL certificate',
            };
        }

        if (params.reliabilityScore < 60) {
            return {
                isValid: false,
                result: 'INVALID',
                reason: `Low reliability score (${params.reliabilityScore}/100)`,
            };
        }

        return {
            isValid: true,
            result: 'VALID',
        };
    }
}
