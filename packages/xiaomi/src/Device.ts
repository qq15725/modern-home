import { createCipheriv, createDecipheriv, createHash } from 'node:crypto'
import { BaseDevice } from '@homeiot/shared'
import type { DeviceInfo } from './types'

export class Device extends BaseDevice {
  private static callAutoIncrementId = ~~(Math.random() * 10000)

  // Device ID ("did")
  public readonly id: number
  public token?: string
  private tokenKey?: Buffer
  private tokenIv?: Buffer
  public serverStamp?: number
  public serverStampTime?: number

  constructor(info: DeviceInfo) {
    const { host, port, id, token, ...props } = info
    super(host, port, { type: 'udp4' })
    this.id = id
    token && this.setToken(token)
    Object.assign(this, props)
  }

  public setToken(token: string) {
    this.token = token
    this.tokenKey = createHash('md5').update(this.token).digest()
    this.tokenIv = createHash('md5').update(this.tokenKey).update(this.token).digest()
  }

  /**
   *  0                   1                   2                   3
   *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
   * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   * | Magic number = 0x2131         | Packet Length (incl. header)  |
   * |-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-|
   * | Unknown1                                                      |
   * |-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-|
   * | Device ID ("did")                                             |
   * |-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-|
   * | Stamp                                                         |
   * |-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-|
   * | MD5 checksum                                                  |
   * | ... or Device Token in response to the "Hello" packet         |
   * |-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-|
   * | optional variable-sized data (encrypted)                      |
   * |...............................................................|
   */
  protected encrypt(data: Buffer) {
    if (
      !this.token
      || !this.tokenKey
      || !this.tokenIv
    ) {
      throw new Error('asdsad')
    }

    const header = Buffer.alloc(2 + 2 + 4 + 4 + 4 + 16)
    header.writeInt16BE(0x2131)

    // Encrypt the data
    const cipher = createCipheriv('aes-128-cbc', this.tokenKey, this.tokenIv)
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()])

    // Set the length
    header.writeUInt16BE(32 + encrypted.length, 2)

    // Unknown
    header.writeUInt32BE(0x00000000, 4)

    // Stamp
    if (this.serverStamp && this.serverStampTime) {
      const secondsPassed = Math.floor((Date.now() - this.serverStampTime) / 1000)
      header.writeUInt32BE(this.serverStamp + secondsPassed, 12)
    } else {
      header.writeUInt32BE(0xFFFFFFFF, 12)
    }

    // Device ID
    header.writeUInt32BE(this.id, 8)

    // MD5 Checksum
    const digest
      = createHash('md5')
        .update(header.subarray(0, 16))
        .update(this.token)
        .update(encrypted)
        .digest()

    digest.copy(header, 16)

    return Buffer.concat([header, encrypted])
  }

  public call(method: string, params?: Record<string, any>): Promise<any> {
    const id = ++Device.callAutoIncrementId
    return this.send(
      this.encrypt(
        Buffer.from(
          JSON.stringify({ id, method, params }),
          'utf8',
        ),
      ),
    )
  }

  protected onMessage(message: Buffer) {
    if (
      !this.token
      || !this.tokenKey
      || !this.tokenIv
    ) return

    // const deviceId = message.readUInt32BE(8)
    const stamp = message.readUInt32BE(12)
    const checksum = message.subarray(16, 32)
    const encrypted = message.subarray(32)

    if (
      encrypted.length === 0
      || !checksum.equals(
        createHash('md5')
          .update(message.subarray(0, 16))
          .update(this.token)
          .update(encrypted)
          .digest(),
      )
    ) return

    if (stamp > 0) {
      this.serverStamp = stamp
      this.serverStampTime = Date.now()
    }

    const decipher = createDecipheriv('aes-128-cbc', this.tokenKey, this.tokenIv)
    const data = Buffer.concat([decipher.update(encrypted), decipher.final()])

    console.log(data)
  }
}
