import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AppService } from './app.service';
import { ApplicantInterface } from '@app/common/interface/applicant.interface';
import { ApplicantStatusInterface } from '@app/common/interface/applicant-status.interface';
import { RMQ_CONSTANTS } from '@app/common/queue-constants/constants';
import { TranscriptionCompleteMessage } from '@app/common/interface/interview-messages.interface';
import { EvaluationCompleteMessage } from '@app/common/interface/interview-evaluation-messages.interface';
import { handleRmqMessage } from '@app/common';

@Controller()
export class AppHandler {
    private readonly logger = new Logger(AppHandler.name);

    constructor(private readonly appService: AppService) {}

    @EventPattern(RMQ_CONSTANTS.CORE.listensTo.score_cv)
    async handleScoreCv(
        @Ctx() context: RmqContext,
        @Payload() payload: ApplicantInterface,
    ) {
        await handleRmqMessage(
            context,
            () => this.appService.ScoreCV(payload),
            { logger: this.logger },
        );
    }

    @EventPattern(RMQ_CONSTANTS.CORE.listensTo.analyze_status)
    async handleAnalyzeStatus(
        @Ctx() context: RmqContext,
        @Payload() payload: ApplicantStatusInterface,
    ) {
        await handleRmqMessage(
            context,
            async () => {
                if (payload.success) {
                    await this.appService.AiSuccessHandler(payload);
                } else {
                    await this.appService.AiErrorHandler(payload);
                }
            },
            { logger: this.logger },
        );
    }

    @EventPattern(RMQ_CONSTANTS.CORE.listensTo.transcription_complete)
    async handleTranscriptionComplete(
        @Ctx() context: RmqContext,
        @Payload() message: TranscriptionCompleteMessage,
    ) {
        await handleRmqMessage(
            context,
            () => this.appService.handleTranscriptionComplete(message),
            { logger: this.logger },
        );
    }

    @EventPattern(RMQ_CONSTANTS.CORE.listensTo.evaluation_complete)
    async handleEvaluationComplete(
        @Ctx() context: RmqContext,
        @Payload() message: EvaluationCompleteMessage,
    ) {
        await handleRmqMessage(
            context,
            () => this.appService.handleEvaluationComplete(message),
            { logger: this.logger },
        );
    }
}
