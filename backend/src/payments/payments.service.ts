import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

// @ts-ignore
const moncash = require('moncash-sdk');

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
  ) {
    moncash.configure({
      mode:
        process.env.MONCASH_MODE ||
        'sandbox',

      client_id:
        process.env.MONCASH_CLIENT_ID,

      client_secret:
        process.env.MONCASH_SECRET_KEY,
    });
  }

  async createMonCashPayment(
    amount: number,
    userId: string,
    agentId?: string,
  ): Promise<string> {
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
    return new Promise(
      async (resolve, reject) => {
        const capture =
          moncash.capture;

        capture.getByTransactionId(
          transactionId,

          async (
            error,
            payment,
          ) => {
            if (error) {
              console.error(error);

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

            // 🔥 Vérifier wallet
            const wallet =
              await this.prisma.wallet.findUnique(
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

            // 🔥 éviter double crédit
            const existingTransaction =
              await this.prisma.transaction.findFirst(
                {
                  where: {
                    reference:
                      transactionId,
                  },
                },
              );

            if (
              existingTransaction
            ) {
              return resolve(
                existingTransaction,
              );
            }

            // 🔥 crédit wallet
            const updatedWallet =
              await this.prisma.wallet.update(
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
              await this.prisma.transaction.create(
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
            await this.prisma.ledgerEntry.create(
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

            // ===================================================
            // 🔥 COMMISSION AGENT
            // ===================================================

            if (agentId) {
              const agent =
                await this.prisma.agent.findUnique(
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

                await this.prisma.agentWallet.update(
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

                await this.prisma.commission.create(
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

            console.log(
              `✅ Wallet crédité: ${amount} HTG`,
            );

            resolve(transaction);
          },
        );
      },
    );
  }
}