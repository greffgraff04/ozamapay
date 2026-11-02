import { PrismaService } from '../../prisma/prisma.service';

interface ReviewAccountAuditInput {
  userId?: string | null;
  email: string;
  method: string;
  path: string;
  ipAddress?: string | null;
}

// Pataje ant ReviewAccountBlockGuard (demand bloke), ReviewAccountAuditInterceptor
// (demand otorize), ak OtpService (send/verify, anvan menm gen yon sesyon) —
// yon sèl pwen ekriti pou "chak demand" de kont demo yo. JAMÈ kòd OTP a,
// JAMÈ modpas/PIN, sèlman method/path/ip — konsistan ak règ "pa gen sekrè
// nan okenn log" ki deja egziste pou OtpService.send() pi wo a.
//
// Echèk ekriti BDD pa dwe janm fè yon vrè demand (oswa yon blokaj legitim)
// echwe — log la se "best effort", kenbe nan yon try/catch.
export async function logReviewAccountActivity(
  prisma: PrismaService,
  input: ReviewAccountAuditInput,
): Promise<void> {
  try {
    await prisma.reviewAccountAuditLog.create({
      data: {
        userId: input.userId ?? null,
        email: input.email,
        method: input.method,
        path: input.path,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error('[review-account-audit] ekri log echwe (pa blokan):', (err as Error)?.message);
  }
}
