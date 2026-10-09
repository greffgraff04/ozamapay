import {
  Injectable,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isStaging } from '../config/app-env';

// @ts-ignore
const moncash = require('moncash-sdk');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  // Only ever false in staging (see constructor) — in prod the constructor
  // throws instead of leaving this set, exactly like before this change.
  private enabled = true;

  constructor(
    private prisma: PrismaService,
  ) {
    const mode = process.env.MONCASH_MODE;
    const clientId = process.env.MONCASH_CLIENT_ID;
    const clientSecret = process.env.MONCASH_SECRET_KEY;

    if (isStaging()) {
      // MonCash (native SDK) has a real sandbox mode — allow it ONLY when
      // explicitly configured for sandbox with its own credentials. Any
      // other staging state (missing mode, missing creds, or mode=live)
      // disables the service instead of risking a real "live" charge —
      // no moncash.configure() call, no network call, ever, in that case.
      this.enabled = mode === 'sandbox' && !!clientId && !!clientSecret;
      if (!this.enabled) {
        this.logger.warn(
          '[staging] PaymentsService (MonCash natif) dezaktive — mete MONCASH_MODE=sandbox ' +
          'ak MONCASH_CLIENT_ID/MONCASH_SECRET_KEY (sandbox) pou aktive l.',
        );
        return;
      }
    } else if (!mode) {
      throw new Error(
        'MONCASH_MODE environment variable must be set ("live" in production, "sandbox" for testing)',
      );
    }

    moncash.configure({
      mode,
      client_id: clientId,
      client_secret: clientSecret,
    });
  }

  async createMonCashPayment(
    amount: number,
    userId: string,
    agentId?: string,
  ): Promise<string> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('Indisponible en staging');
    }
    const payment_creator =
      moncash.payment;

    // 🔥 metadata encoded
    const orderId = `OZAMA-${userId}-${agentId || 'NO_AGENT'}-${Date.now()}`;

    const create_payment_json = {
      amount,
      orderId,
    };

    return new Promise(
      (resolve, reject) => {
        payment_creator.create(
          create_payment_json,

          (
            error: any,
            payment: any,
          ) => {
            if (error) {
              console.error(error);

              reject(error);
            } else {
              const redirectUri =
                payment_creator.redirect_uri(
                  payment,
                );

              resolve(redirectUri);
            }
          },
        );
      },
    );
  }

  async validateMonCashPayment(
    transactionId: string,
  ) {
    if (!this.enabled) {
      throw new ServiceUnavailableException('Indisponible en staging');
    }
    return new Promise(
      (resolve, reject) => {
        const capture =
          moncash.capture;

        capture.getByTransactionId(
          transactionId,

          async (
            error: any,
            payment: any,
          ) => {
            try {
              if (error) {
                return reject(error);
              }

              const status =
                payment.payment.status;

              if (
                status !==
                'successful'
              ) {
                return resolve(null);
              }

              const amount =
                Number(
                  payment.payment.cost,
                );

              const orderId =
                payment.payment.order_id;

              // 🔥 Decode metadata
              const parts =
                orderId.split('-');

              const userId =
                parts[1];

              const agentId =
                parts[2] !==
                'NO_AGENT'
                  ? parts[2]
                  : null;

              // Wrap all DB writes in a Serializable transaction.
              // Re-checking reference inside the transaction makes the
              // idempotency check race-safe (fixes double-spend).
              const result =
                await this.prisma.$transaction(
                  async (tx) => {
                    // 🔒 Race-safe idempotency check
                    const existingTransaction =
                      await tx.transaction.findFirst(
                        {
                          where: {
                            reference:
                              transactionId,
                          },
                        },
                      );

                    if (existingTransaction) {
                      return existingTransaction;
                    }

                    // Find wallet inside transaction
                    const wallet =
                      await tx.wallet.findUnique(
                        {
                          where: {
                            userId,
                          },
                        },
                      );

                    if (!wallet) {
                      throw new BadRequestException(
                        'Wallet not found',
                      );
                    }

                    // 🔥 crédit wallet
                    const updatedWallet =
                      await tx.wallet.update(
                        {
                          where: {
                            userId,
                          },

                          data: {
                            balance: {
                              increment:
                                amount,
                            },
                          },
                        },
                      );

                    // 🔥 transaction
                    const transaction =
                      await tx.transaction.create(
                        {
                          data: {
                            reference:
                              transactionId,

                            amount,

                            netAmount:
                              amount,

                            type:
                              'TOPUP',

                            status:
                              'COMPLETED',

                            title:
                              'MonCash Topup',

                            description:
                              'Recharge MonCash',

                            receiverWalletId:
                              wallet.id,
                          },
                        },
                      );

                    // 🔥 ledger
                    await tx.ledgerEntry.create(
                      {
                        data: {
                          walletId:
                            wallet.id,

                          transactionId:
                            transaction.id,

                          type:
                            'CREDIT',

                          amount,

                          balanceBefore:
                            wallet.balance,

                          balanceAfter:
                            updatedWallet.balance,
                        },
                      },
                    );

                    // 🔥 COMMISSION AGENT (inside transaction)
                    if (agentId) {
                      const agent =
                        await tx.agent.findUnique(
                          {
                            where: {
                              id: agentId,
                            },

                            include: {
                              wallet: true,
                            },
                          },
                        );

                      if (
                        agent &&
                        agent.wallet
                      ) {
                        const commission =
                          amount * 0.02;

                        await tx.agentWallet.update(
                          {
                            where: {
                              agentId:
                                agent.id,
                            },

                            data: {
                              balance: {
                                increment:
                                  commission,
                              },
                            },
                          },
                        );

                        await tx.commission.create(
                          {
                            data: {
                              agentId:
                                agent.id,

                              type:
                                'TOPUP',

                              amount:
                                commission,
                            },
                          },
                        );
                      }
                    }

                    return transaction;
                  },
                  {
                    isolationLevel:
                      Prisma.TransactionIsolationLevel.Serializable,
                  },
                );

              resolve(result);
            } catch (err) {
              reject(err);
            }
          },
        );
      },
    );
  }
}
