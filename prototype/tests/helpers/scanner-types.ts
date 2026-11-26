import type {createTonPaymentService} from '../../src/server/payments/ton/service.ts';
/** The webhook path never calls the payment service; tests pass an empty stand-in typed as the real one. */
export type TonPaymentService = ReturnType<typeof createTonPaymentService>;
