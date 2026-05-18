export interface UrlVerificationResponse {
    valid: boolean;
    result: string;
    isReachable: boolean;
    hasValidDns: boolean;
    hasValidSsl: boolean;
    reliabilityScore: number;
    statusCode?: number;
    domain: string;
    reason?: string;
}
