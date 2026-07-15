import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class UpdatesService {
  private readonly logger = new Logger(UpdatesService.name)
  private readonly repo: string
  private readonly token: string
  private readonly apiBase = 'https://api.github.com'
  private readonly downloadBase = 'https://github.com'

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.repo = this.configService.get<string>('GITHUB_REPO', 'RafaRem/DistribuidoraFront')
    this.token = this.configService.get<string>('GITHUB_TOKEN', '')
  }

  async getUpdateJson(proxyBaseUrl: string): Promise<any> {
    if (!this.token) {
      throw new NotFoundException('GITHUB_TOKEN no configurado')
    }

    const { data: release } = await this.httpService.axiosRef.get(
      `${this.apiBase}/repos/${this.repo}/releases/latest`,
      { headers: { Authorization: `Bearer ${this.token}` } },
    )

    const updateAsset = release.assets.find((a: any) => a.name === 'update.json')
    if (!updateAsset) {
      throw new NotFoundException('update.json no encontrado en la última release')
    }

    const { data: updateJson } = await this.httpService.axiosRef.get(
      `${this.apiBase}/repos/${this.repo}/releases/assets/${updateAsset.id}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/octet-stream',
        },
      },
    )

    for (const [platform, info] of Object.entries(updateJson.platforms)) {
      const pInfo = info as any
      const match = pInfo.url.match(/\/releases\/download\/([^/]+)\/(.+)$/)
      if (match) {
        pInfo.url = `${proxyBaseUrl}/updates/download/${match[1]}/${match[2]}`
      }
    }

    return updateJson
  }

  async downloadFile(tag: string, filename: string) {
    if (!this.token) {
      throw new NotFoundException('GITHUB_TOKEN no configurado')
    }

    const url = `${this.downloadBase}/${this.repo}/releases/download/${tag}/${filename}`

    try {
      const response = await this.httpService.axiosRef.get(url, {
        headers: { Authorization: `Bearer ${this.token}` },
        responseType: 'stream',
        validateStatus: (status) => status === 200,
      })

      const ct = filename.endsWith('.sig')
        ? 'text/plain'
        : filename.endsWith('.exe')
          ? 'application/x-msdownload'
          : 'application/octet-stream'

      return { stream: response.data, contentType: ct }
    } catch (err: any) {
      if (err.response?.status === 404) {
        throw new NotFoundException(`Archivo ${filename} no encontrado en release ${tag}`)
      }
      throw err
    }
  }
}
