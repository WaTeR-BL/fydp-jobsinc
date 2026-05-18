import { Module } from '@nestjs/common';
import { MediaManagerService } from './media-manager.service';
import { HttpModule } from '@nestjs/axios';

@Module({
    providers: [MediaManagerService],
    exports: [MediaManagerService],
    imports: [HttpModule],
})
export class MediaManagerModule {}
