import { Module } from '@nestjs/common';
import { EnterpriseDatabaseController } from './enterprise.controller';
import { EnterpriseDatabaseService } from './enterprise.service';

@Module({
  controllers: [EnterpriseDatabaseController],
  providers: [EnterpriseDatabaseService],
  exports: [EnterpriseDatabaseService],
})
export class EnterpriseModule {}
