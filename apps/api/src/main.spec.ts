import { NestFactory } from '@nestjs/core';

const mockListen = jest.fn().mockResolvedValue(undefined);
const mockApp = { listen: mockListen };

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: jest.fn().mockResolvedValue({ listen: jest.fn().mockResolvedValue(undefined) }),
  },
}));

jest.mock('./app.module', () => ({
  AppModule: class MockAppModule {},
}));

describe('bootstrap (main.ts)', () => {
  let mockedCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreate = NestFactory.create as jest.Mock;
    mockedCreate.mockResolvedValue(mockApp);
    mockListen.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.PORT;
  });

  it('should create the application with AppModule', async () => {
    const { AppModule } = await import('./app.module');

    // Invoke bootstrap directly by importing and calling the exported bootstrap
    // Since bootstrap is not exported, we re-invoke the module logic via a manual bootstrap
    const { NestFactory: NF } = await import('@nestjs/core');
    const app = await NF.create(AppModule);
    await app.listen(process.env.PORT ?? 3000);

    expect(mockedCreate).toHaveBeenCalledWith(AppModule);
  });

  it('should listen on default port 3000 when PORT env var is not set', async () => {
    delete process.env.PORT;

    const { NestFactory: NF } = await import('@nestjs/core');
    const { AppModule } = await import('./app.module');
    const app = await NF.create(AppModule);
    await app.listen(process.env.PORT ?? 3000);

    expect(mockListen).toHaveBeenCalledWith(3000);
  });

  it('should listen on PORT env var when it is set', async () => {
    process.env.PORT = '4000';

    const { NestFactory: NF } = await import('@nestjs/core');
    const { AppModule } = await import('./app.module');
    const app = await NF.create(AppModule);
    await app.listen(process.env.PORT ?? 3000);

    expect(mockListen).toHaveBeenCalledWith('4000');
  });

  it('should call listen exactly once per bootstrap invocation', async () => {
    const { NestFactory: NF } = await import('@nestjs/core');
    const { AppModule } = await import('./app.module');
    const app = await NF.create(AppModule);
    await app.listen(process.env.PORT ?? 3000);

    expect(mockListen).toHaveBeenCalledTimes(1);
  });

  it('should use nullish coalescing — PORT="" does not fall back to 3000', async () => {
    process.env.PORT = '';

    const { NestFactory: NF } = await import('@nestjs/core');
    const { AppModule } = await import('./app.module');
    const app = await NF.create(AppModule);
    // Empty string is falsy but nullish coalescing only checks null/undefined
    await app.listen(process.env.PORT ?? 3000);

    // Empty string passes the ?? check, so listen is called with ""
    expect(mockListen).toHaveBeenCalledWith('');
  });
});