import { MetricInterface } from '@app/common/interface/metric.interface';

export interface AnalysisPayloadInterface {
    tenantBusinessId: string;
    contact?: string;
    jobApplicantId: string;
    cvUrl: string;
    tenantLiveContact: string;
    jobMetric: MetricInterface[];
}

export interface AIResponseInterface {
    contact?: string;
    percentage: number;
    feedback: string;
    metricFeedback: MetricFeedback[];
}

interface MetricFeedback {
    metricId: string;
    percentage: number;
}
