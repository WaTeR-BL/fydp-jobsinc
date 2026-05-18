export class TotalUsersStatDto {
    count: number;
    changePercent: number;
}

export class ActiveDomainsStatDto {
    count: number;
    newThisWeek: number;
}

export class RunningJobsStatDto {
    count: number;
    completedToday: number;
}

export class StatsDto {
    totalUsers: TotalUsersStatDto;
    activeDomains: ActiveDomainsStatDto;
    runningJobs: RunningJobsStatDto;
}

export class ChartDataPointDto {
    day: string;
    count: number;
}

export class WeeklyMetricDto {
    count: number;
    changePercent: number;
}

export class AvgTimeToHireDto {
    days: number;
    changeDays: number;
}

export class WeeklyApplicantFlowDto {
    chartData: ChartDataPointDto[];
    applicantsProcessed: WeeklyMetricDto;
    interviewsThisWeek: WeeklyMetricDto;
    avgTimeToHire: AvgTimeToHireDto;
}

export class HealthMetricDto {
    value: number;
    change: number;
}

export class SlaAdherenceDto {
    value: number;
    change: number;
    status: string;
}

export class OperationalHealthDto {
    completionRate: HealthMetricDto;
    avgResponseDays: HealthMetricDto;
    slaAdherence: SlaAdherenceDto;
}

export class RecentJobDto {
    title: string;
    domain: string;
    status: string;
    progress: number;
}

export class DashboardDataDto {
    stats: StatsDto;
    weeklyApplicantFlow: WeeklyApplicantFlowDto;
    operationalHealth: OperationalHealthDto;
    recentJobs: RecentJobDto[];
}
