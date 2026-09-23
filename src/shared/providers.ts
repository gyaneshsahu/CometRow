// Domain modules depend on these contracts. Provider SDKs stay in adapters.
export interface Clock {
  now(): Date;
}
export interface IdGenerator {
  next(): string;
}
export interface ObjectStorage {
  authorizeUpload(input: {
    key: string;
    contentType: string;
    maxBytes: number;
    expiresInSeconds: number;
  }): Promise<{ url: string; headers: Record<string, string> }>;
  delete(key: string): Promise<void>;
}
export interface VideoService {
  getStatus(providerKey: string): Promise<{
    status: 'processing' | 'ready' | 'failed';
    playbackUrl?: string;
  }>;
  delete(providerKey: string): Promise<void>;
}
export interface EmailService {
  send(message: { to: string; subject: string; text: string }): Promise<void>;
}
export interface EventSink {
  emit(event: {
    type: string;
    occurredAt: Date;
    campaignId: string;
    channelId?: string;
  }): Promise<void>;
}
export interface MalwareScanner {
  scan(key: string): Promise<'clean' | 'infected' | 'unavailable'>;
}
