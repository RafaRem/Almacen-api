import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { UpdatesController } from './updates.controller'
import { UpdatesService } from './updates.service'

@Module({
  imports: [HttpModule],
  controllers: [UpdatesController],
  providers: [UpdatesService],
})
export class UpdatesModule {}
