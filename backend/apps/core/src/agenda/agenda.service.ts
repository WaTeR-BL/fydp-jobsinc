import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Agenda, Job } from 'agenda';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AgendaService implements OnModuleInit, OnModuleDestroy {
    private readonly agenda: Agenda;

    constructor(private configService: ConfigService) {
        const mongoUrl = this.configService.get<string>('mongo.uri');

        this.agenda = new Agenda({
            db: {
                address: mongoUrl,
                collection: 'agenda',
            },
            processEvery: '5 seconds',
            maxConcurrency: 50,
            defaultConcurrency: 5,
            defaultLockLifetime: 60000,
        });

        this.setupEventHandlers();
    }

    async onModuleInit(): Promise<void> {
        try {
            console.log('agenda startup');
            await this.agenda.start();
        } catch (err) {
            console.log('agenda startup error: ', err);
        }
    }

    async onModuleDestroy(): Promise<void> {
        try {
            console.log('agenda shutdown');
            await this.agenda.stop();
        } catch (err) {
            console.log('agenda shutdown error: ', err);
        }
    }

    private setupEventHandlers() {
        this.agenda.on('ready', () => {
            console.log('Agenda is ready');
        });

        this.agenda.on('error', (error) => {
            console.error('Agenda error', error);
        });

        this.agenda.on('start', (job: Job) => {
            console.debug(`Job ${job.attrs.name} starting`);
        });

        this.agenda.on('complete', (job: Job) => {
            console.debug(`Job ${job.attrs.name} completed`);
        });

        this.agenda.on('fail', (error: Error, job: Job) => {
            console.error(`Job ${job.attrs.name} failed`, error);
        });
    }

    getAgenda(): Agenda {
        return this.agenda;
    }

    async scheduleJob(jobName: string, date: Date, data?: any): Promise<Job> {
        try {
            const job = await this.agenda.schedule(date, jobName, data);
            console.log(`Scheduled job: ${jobName} at ${date.toISOString()}`);
            return job;
        } catch (error) {
            console.error(`Failed to schedule job: ${jobName}`, error);
            throw error;
        }
    }

    async cancelJob(jobId: string): Promise<number> {
        try {
            const numRemoved = await this.agenda.cancel({ _id: jobId });
            console.log(`Cancelled ${numRemoved} job(s) with id: ${jobId}`);
            return numRemoved;
        } catch (error) {
            console.error(`Failed to cancel job: ${jobId}`, error);
            throw error;
        }
    }

    async cancelJobsByName(jobName: string, data?: any): Promise<number> {
        try {
            const query: any = { name: jobName };
            if (data) {
                query.data = data;
            }
            const numRemoved = await this.agenda.cancel(query);
            console.log(`Cancelled ${numRemoved} job(s) with name: ${jobName}`);
            return numRemoved;
        } catch (error) {
            console.error(`Failed to cancel jobs: ${jobName}`, error);
            throw error;
        }
    }
}
