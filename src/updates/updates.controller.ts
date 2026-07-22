import { Controller, Get, Param, Req, Res } from '@nestjs/common'
import type { Response, Request } from 'express'
import { UpdatesService } from './updates.service'

@Controller('updates')
export class UpdatesController {
  constructor(private readonly updatesService: UpdatesService) {}

  @Get('update.json')
  async getUpdateJson(@Req() req: Request) {
    const baseUrl = `https://${req.get('host')}`
    return this.updatesService.getUpdateJson(baseUrl)
  }

  @Get('download/:tag/:filename')
  async downloadFile(
    @Param('tag') tag: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const { stream, contentType } = await this.updatesService.downloadFile(tag, filename)
    res.setHeader('Content-Type', contentType)
    stream.pipe(res)
  }
}
