import { Injectable, Logger } from '@nestjs/common';

/** SMS sağlayıcı soyutlaması — Netgsm / İleti Merkezi vb. buraya eklenir */
export abstract class SmsProvider {
  abstract send(phone: string, message: string): Promise<void>;
}

@Injectable()
export class ConsoleSmsProvider extends SmsProvider {
  private readonly logger = new Logger('SMS');
  async send(phone: string, message: string) {
    this.logger.warn(`[GELİŞTİRME] ${phone} → ${message}`);
  }
}

@Injectable()
export class NetgsmSmsProvider extends SmsProvider {
  async send(phone: string, message: string) {
    // Netgsm OTP REST: https://www.netgsm.com.tr/dokuman/ — TODO(sms): dokümana göre doğrula
    const params = new URLSearchParams({
      usercode: process.env.NETGSM_USERCODE ?? '',
      password: process.env.NETGSM_PASSWORD ?? '',
      gsmno: `90${phone}`,
      message,
      msgheader: process.env.NETGSM_HEADER ?? '',
    });
    const res = await fetch(`https://api.netgsm.com.tr/sms/send/otp?${params}`);
    if (!res.ok) throw new Error(`Netgsm hata: ${res.status}`);
  }
}
