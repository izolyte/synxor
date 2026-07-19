import { Module } from '@nestjs/common';
import { UPLOAD_SESSION_STORE } from '../../domain/transfer/upload-session';
import { InMemoryUploadSessionStore } from './in-memory-upload-session.store';

// The upload session store is in-memory today (a Map), so the upload path and the
// expiry sweeper must resolve the *same* instance — the sweeper reaps sessions the
// upload path created. Owning the provider here and exporting it keeps it a single
// shared singleton across both modules instead of one Map per module.
@Module({
  providers: [{ provide: UPLOAD_SESSION_STORE, useClass: InMemoryUploadSessionStore }],
  exports: [UPLOAD_SESSION_STORE],
})
export class UploadSessionModule {}
