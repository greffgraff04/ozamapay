// Confirms the manual admin trigger endpoints (POST /admin/sweep/run,
// GET /admin/reconciliation/run) are guarded by TRON_NETWORK in staging —
// these bypass the @Cron wrapper guards entirely since they call the
// service directly, so they need their own check (see app-env.ts
// assertTronManualTriggerAllowedInStaging).
import { ForbiddenException } from '@nestjs/common';
import { SweepController } from '../tron/sweep.controller';
import { ReconciliationController } from '../tron/reconciliation.controller';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.clearAllMocks();
});

function setStaging(network?: string) {
  process.env.APP_ENV = 'staging';
  if (network === undefined) delete process.env.TRON_NETWORK;
  else process.env.TRON_NETWORK = network;
}

describe('SweepController.run', () => {
  it('refuses with ForbiddenException in staging when TRON_NETWORK is unset, never calling runSweep', async () => {
    setStaging(undefined);
    const runSweep = jest.fn();
    const controller = new SweepController({ runSweep } as any);
    await expect(controller.run()).rejects.toBeInstanceOf(ForbiddenException);
    expect(runSweep).not.toHaveBeenCalled();
  });

  it('refuses in staging when TRON_NETWORK=mainnet', async () => {
    setStaging('mainnet');
    const runSweep = jest.fn();
    const controller = new SweepController({ runSweep } as any);
    await expect(controller.run()).rejects.toBeInstanceOf(ForbiddenException);
    expect(runSweep).not.toHaveBeenCalled();
  });

  it('allows it through in staging when TRON_NETWORK=nile', async () => {
    setStaging('nile');
    const runSweep = jest.fn().mockResolvedValue({ ok: true });
    const controller = new SweepController({ runSweep } as any);
    await controller.run('true');
    expect(runSweep).toHaveBeenCalledWith(true);
  });

  it('prod-identical: calls runSweep when APP_ENV is unset, regardless of TRON_NETWORK', async () => {
    delete process.env.APP_ENV;
    delete process.env.TRON_NETWORK;
    const runSweep = jest.fn().mockResolvedValue({ ok: true });
    const controller = new SweepController({ runSweep } as any);
    await controller.run();
    expect(runSweep).toHaveBeenCalledTimes(1);
  });
});

describe('ReconciliationController.run', () => {
  it('refuses with ForbiddenException in staging when TRON_NETWORK is unset, never calling runReconciliation', async () => {
    setStaging(undefined);
    const runReconciliation = jest.fn();
    const controller = new ReconciliationController({ runReconciliation } as any);
    await expect(controller.run()).rejects.toBeInstanceOf(ForbiddenException);
    expect(runReconciliation).not.toHaveBeenCalled();
  });

  it('allows it through in staging when TRON_NETWORK=testnet', async () => {
    setStaging('testnet');
    const runReconciliation = jest.fn().mockResolvedValue({ ok: true });
    const controller = new ReconciliationController({ runReconciliation } as any);
    await controller.run();
    expect(runReconciliation).toHaveBeenCalledTimes(1);
  });

  it('prod-identical: calls runReconciliation when APP_ENV is unset', async () => {
    delete process.env.APP_ENV;
    delete process.env.TRON_NETWORK;
    const runReconciliation = jest.fn().mockResolvedValue({ ok: true });
    const controller = new ReconciliationController({ runReconciliation } as any);
    await controller.run();
    expect(runReconciliation).toHaveBeenCalledTimes(1);
  });
});
