import { PrismaService } from './prisma.service';

// Fix staging 2026-10-13 — $connect() san timeout te ka kenbe boot la ap
// tann san okenn log jiskaske Render touye deplwaman an (~15 min port scan
// timeout). 20s timeout + log clè + process.exit(1) pou Render ka restat.
describe('PrismaService.onModuleInit — timeout de connexion DB', () => {
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('connexion rapide → aucun timeout, aucun process.exit', async () => {
    const connectSpy = jest.spyOn(PrismaService.prototype, '$connect').mockResolvedValue(undefined as any);
    const service = new PrismaService();

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('connexion qui ne répond jamais (hang) → timeout 20s déclenche process.exit(1) avec un log clair', async () => {
    jest.spyOn(PrismaService.prototype, '$connect').mockImplementation(() => new Promise(() => {}));
    const service = new PrismaService();
    const loggerErrorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});

    const initPromise = service.onModuleInit();
    await jest.advanceTimersByTimeAsync(20_000);
    await initPromise;

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('timeout'));
  });

  it("connexion qui rejette normalement (erreur DB) → process.exit(1) immédiatement, sans attendre 20s", async () => {
    jest.spyOn(PrismaService.prototype, '$connect').mockRejectedValue(new Error('connection refused'));
    const service = new PrismaService();
    const loggerErrorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});

    await service.onModuleInit();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('connection refused'));
  });
});
