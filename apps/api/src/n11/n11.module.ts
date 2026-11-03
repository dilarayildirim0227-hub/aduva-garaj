import { Global, Logger, Module } from '@nestjs/common';
import { N11_CLIENT } from './n11-client.interface';
import { N11MockClient } from './n11-mock.client';
import { N11SoapClient } from './n11-soap.client';
import { N11SyncController, N11SyncService } from './n11-sync.service';

@Global()
@Module({
  controllers: [N11SyncController],
  providers: [
    {
      provide: N11_CLIENT,
      useFactory: () => {
        const { N11_APP_KEY, N11_APP_SECRET, N11_BASE_URL } = process.env;
        if (!N11_APP_KEY || !N11_APP_SECRET) {
          new Logger('N11Module').warn('n11 anahtarları yok → N11MockClient kullanılıyor');
          return new N11MockClient();
        }
        return new N11SoapClient(N11_APP_KEY, N11_APP_SECRET, N11_BASE_URL);
      },
    },
    N11SyncService,
  ],
  exports: [N11_CLIENT, N11SyncService],
})
export class N11Module {}
