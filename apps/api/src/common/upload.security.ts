import { createHmac, timingSafeEqual } from 'crypto';
import { AppDomainError, ErrorCode } from './error-codes';
import { getJwtSecret } from './security';

// İzin verilen dosya türleri ve maksimum boyut sınırları
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_CSV_BYTES = 10 * 1024 * 1024; // 10 MB

export interface UploadFileDescriptor {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  headerBytes?: Uint8Array;
}

export interface VirusScannerAdapter {
  scanBuffer(buffer: Uint8Array, fileName: string): Promise<{ clean: boolean; threat?: string }>;
}

// Varsayılan EICAR imza kontrolcüsü (ClamAV entegrasyon yer tutucusu)
export class DefaultVirusScanner implements VirusScannerAdapter {
  async scanBuffer(buffer: Uint8Array): Promise<{ clean: boolean; threat?: string }> {
    const sample = Buffer.from(buffer.slice(0, 256)).toString('utf8');
    if (sample.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
      return { clean: false, threat: 'EICAR-Test-Signature' };
    }
    return { clean: true };
  }
}

// Magic-byte (dosya başlığı) doğrulaması
function verifyMagicBytes(mimeType: string, header?: Uint8Array): boolean {
  if (!header || header.length < 4) return true;
  if (mimeType === 'image/jpeg') {
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47
    );
  }
  if (mimeType === 'image/webp') {
    // "RIFF"
    return (
      header[0] === 0x52 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x46
    );
  }
  return true;
}

export async function validateUploadedFile(
  file: UploadFileDescriptor,
  scanner: VirusScannerAdapter = new DefaultVirusScanner(),
): Promise<{ sanitizedFileName: string; mimeType: string; sizeBytes: number }> {
  if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
    throw new AppDomainError(
      ErrorCode.UPLOAD_INVALID_MIME,
      `Desteklenmeyen dosya türü (${file.mimeType}). Yalnızca JPEG, PNG, WebP ve CSV kabul edilir.`,
      415,
    );
  }

  const maxAllowed = file.mimeType === 'text/csv' ? MAX_CSV_BYTES : MAX_IMAGE_BYTES;
  if (file.sizeBytes <= 0 || file.sizeBytes > maxAllowed) {
    throw new AppDomainError(
      ErrorCode.UPLOAD_FILE_TOO_LARGE,
      `Dosya boyutu sınırı aşıldı (Maksimum: ${Math.round(maxAllowed / (1024 * 1024))} MB).`,
      413,
    );
  }

  if (!verifyMagicBytes(file.mimeType, file.headerBytes)) {
    throw new AppDomainError(
      ErrorCode.UPLOAD_INVALID_MIME,
      'Dosya içeriği (magic bytes) belirtilen uzantı ile uyuşmuyor.',
      415,
    );
  }

  if (file.headerBytes) {
    const scanResult = await scanner.scanBuffer(file.headerBytes, file.fileName);
    if (!scanResult.clean) {
      throw new AppDomainError(
        ErrorCode.UPLOAD_MALWARE_DETECTED,
        'Güvenlik taraması başarısız: Dosyada zararlı içerik tespit edildi.',
        422,
        { threat: scanResult.threat },
      );
    }
  }

  const sanitizedFileName = file.fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 120);

  return {
    sanitizedFileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
  };
}

// İmzalı (Presigned) Medya Yükleme/İndirme URL Üreticisi
export function createSignedMediaUrl(
  objectKey: string,
  expiresInSeconds = 900,
): { url: string; expiresAt: string; signature: string } {
  const cleanKey = objectKey.replace(/^\/+/, '');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${cleanKey}:${exp}`;
  const signature = createHmac('sha256', getJwtSecret()).update(payload).digest('hex');
  return {
    url: `https://cdn.aduvagaraj.com/${cleanKey}?exp=${exp}&sig=${signature}`,
    expiresAt: new Date(exp * 1000).toISOString(),
    signature,
  };
}

export function verifySignedMediaUrl(objectKey: string, exp: number, signature: string): boolean {
  const nowSec = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(exp) || exp < nowSec) return false;
  const cleanKey = objectKey.replace(/^\/+/, '');
  const expected = createHmac('sha256', getJwtSecret())
    .update(`${cleanKey}:${exp}`)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
