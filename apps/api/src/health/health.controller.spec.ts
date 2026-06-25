import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check()', () => {
    it('should return { status: "ok" }', () => {
      expect(controller.check()).toEqual({ status: 'ok' });
    });

    it('should return an object with exactly one property', () => {
      const result = controller.check();
      expect(Object.keys(result)).toHaveLength(1);
    });

    it('should return status as a string', () => {
      const result = controller.check();
      expect(typeof result.status).toBe('string');
    });

    it('should return a new object reference on each call', () => {
      const first = controller.check();
      const second = controller.check();
      expect(first).not.toBe(second);
    });

    it('should not return a falsy status', () => {
      const result = controller.check();
      expect(result.status).toBeTruthy();
    });
  });
});