import { Module } from '@nestjs/common';
import { TribunaisService } from './tribunais.service';
import { TribunaisController } from './tribunais.controller';
import { StubConnector } from './connectors/stub.connector';
import { DatajudConnector } from './connectors/datajud.connector';
import { PlaywrightConnector } from './connectors/playwright.connector';

@Module({
  controllers: [TribunaisController],
  providers: [TribunaisService, StubConnector, DatajudConnector, PlaywrightConnector],
  exports: [TribunaisService],
})
export class TribunaisModule {}
