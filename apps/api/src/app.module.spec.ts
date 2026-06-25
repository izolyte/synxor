import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { HealthController } from './health/health.controller';
import { ConfigService } from '@nestjs/config';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide ConfigService as a global provider', () => {
    const configService = module.get<ConfigService>(ConfigService);
    expect(configService).toBeDefined();
  });

  it('should register HealthController via HealthModule', () => {
    const controller = module.get<HealthController>(HealthController);
    expect(controller).toBeDefined();
  });

  it('should have HealthController respond correctly after module init', () => {
    const controller = module.get<HealthController>(HealthController);
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});