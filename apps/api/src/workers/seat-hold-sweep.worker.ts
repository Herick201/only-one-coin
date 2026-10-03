import { Worker } from "bullmq";
import { SEAT_HOLD_SWEEP_QUEUE, type QueueRedis } from "@ooc/queue";
import type { ExpireSeatHoldsUseCase } from "@ooc/domain";
import type { FastifyBaseLogger } from "fastify";

/**
 * Hands expired checkout holds back to their class groups every tick
 * (`scheduleSeatHoldSweep`). Keeps nothing of its own: the whole decision is
 * the repository's single statement, so a tick lost to a restart is simply
 * made up by the next one, and two ticks racing each other skip each other's
 * rows (SKIP LOCKED) instead of handing a seat back twice.
 */
export function startSeatHoldSweepWorker(
  redis: QueueRedis,
  logger: FastifyBaseLogger,
  deps: { expireSeatHolds: ExpireSeatHoldsUseCase },
): Worker {
  return new Worker(
    SEAT_HOLD_SWEEP_QUEUE,
    async () => {
      const { expired } = await deps.expireSeatHolds.run();
      if (expired > 0) {
        logger.info({ expired }, "seat hold sweep returned expired holds to their class groups");
      }
    },
    { ...redis, concurrency: 1 },
  );
}
