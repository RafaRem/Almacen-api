import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class UpdatesService {
  private readonly logger = new Logger(UpdatesService.name)
  private readonly repo: string
  private readonly token: string
  private readonly apiBase = 'https://api.github.com'

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.repo = this.configService.get<string>('GITHUB_REPO', 'RafaRem/DistribuidoraFront')
    this.token = this.configService.get<string>('GITHUB_TOKEN', '')
  }

  async getUpdateJson(proxyBaseUrl: string): Promise<any> {
    if (!this.token) {
      this.logger.error('GITHUB_TOKEN no configurado en variables de entorno')
      throw new NotFoundException('GITHUB_TOKEN no configurado')
    }

    let release: any
    try {
      const { data } = await this.httpService.axiosRef.get(
        `${this.apiBase}/repos/${this.repo}/releases/latest`,
        { headers: { Authorization: `Bearer ${this.token}` } },
      )
      release = data
    } catch (err: any) {
      const status = err.response?.status || 'unknown'
      const msg = err.response?.data?.message || err.message || 'Error desconocido'
      this.logger.error(`Error al obtener última release de GitHub: status=${status} msg=${msg}`)
      throw new NotFoundException(`Error al obtener última release: ${msg}`)
    }

    const updateAsset = release.assets?.find((a: any) => a.name === 'update.json')
    if (!updateAsset) {
      this.logger.warn(`update.json no encontrado en release ${release.tag_name}`)
      throw new NotFoundException(`update.json no encontrado en release ${release.tag_name || 'latest'}`)
    }

    let updateJson: any
    try {
      const { data } = await this.httpService.axiosRef.get(
        `${this.apiBase}/repos/${this.repo}/releases/assets/${updateAsset.id}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/octet-stream',
          },
        },
      )
      updateJson = data
    } catch (err: any) {
      const status = err.response?.status || 'unknown'
      const msg = err.response?.data?.message || err.message || 'Error desconocido'
      this.logger.error(`Error al descargar update.json de GitHub: status=${status} msg=${msg}`)
      throw new NotFoundException(`Error al descargar update.json: ${msg}`)
    }

    for (const [platform, info] of Object.entries(updateJson.platforms || {})) {
      const pInfo = info as any
      const match = pInfo.url?.match(/\/releases\/download\/([^/]+)\/(.+)$/)
      if (match) {
        pInfo.url = `${proxyBaseUrl}/updates/download/${match[1]}/${match[2]}`
      }
    }

    return updateJson
  }

  async downloadFile(tag: string, filename: string) {
    if (!this.token) {
      this.logger.error('GITHUB_TOKEN no configurado en variables de entorno')
      throw new NotFoundException('GITHUB_TOKEN no configurado')
    }

    let release: any
    try {
      const { data } = await this.httpService.axiosRef.get(
        `${this.apiBase}/repos/${this.repo}/releases/latest`,
        { headers: { Authorization: `Bearer ${this.token}` } },
      )
      release = data
    } catch (err: any) {
      const status = err.response?.status || 'unknown'
      const msg = err.response?.data?.message || err.message || 'Error desconocido'
      this.logger.error(`Error al obtener latest release: status=${status} msg=${msg}`)
      throw new NotFoundException(`Error al obtener release: ${msg}`)
    }

    const asset = release.assets?.find((a: any) => a.name === filename)
    if (!asset) {
      this.logger.warn(`Archivo ${filename} no encontrado en latest release ${release.tag_name}`)
      throw new NotFoundException(`Archivo ${filename} no encontrado en release ${release.tag_name}`)
    }

    try {
      const response = await this.httpService.axiosRef.get(
        `${this.apiBase}/repos/${this.repo}/releases/assets/${asset.id}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/octet-stream',
          },
          responseType: 'stream',
        },
      )

      const ct = filename.endsWith('.sig')
        ? 'text/plain'
        : filename.endsWith('.exe')
          ? 'application/x-msdownload'
          : 'application/octet-stream'

      return { stream: response.data, contentType: ct }
    } catch (err: any) {
      const status = err.response?.status || 'unknown'
      const msg = err.response?.data?.message || err.message || 'Error desconocido'
      this.logger.error(`Error al descargar ${filename} de release: status=${status} msg=${msg}`)
      throw new NotFoundException(`Error al descargar archivo: ${msg}`)
    }
  }
}
