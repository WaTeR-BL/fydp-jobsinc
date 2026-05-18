export interface ExtractedMetric {
    title: string;
    description: string;
    status: boolean;
}

export interface ExtractMetricsResponse {
    metrics: ExtractedMetric[];
}
