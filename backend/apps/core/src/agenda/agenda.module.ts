import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgendaService } from './agenda.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [AgendaService],
    exports: [AgendaService],
})
export class AgendaModule {}
