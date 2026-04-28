import { Module } from '@nestjs/common';
import { TribunaisService } from './tribunais.service';
import { TribunaisController } from './tribunais.controller';
import { StubConnector } from './connectors/stub.connector';

@Module({
  controllers: [TribunaisController],
  providers: [TribunaisService, StubConnector],
  exports: [TribunaisService],
})
export class TribunaisModule {}
