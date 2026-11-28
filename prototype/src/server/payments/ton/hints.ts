import type {TonNetwork} from './store.ts';

/**
 * One derivation for every transaction hint (webhook delivery or chain scan), so the same
 * transaction always lands on the same durable inbox row regardless of who reported it.
 * A hint is not a payment: the inbox worker re-reads the transaction from the indexer.
 */
export async function transactionHint(network: TonNetwork, recipient: string, lt: string, hash: string) {
  if (!/^[1-9]\d{0,19}$/.test(lt) || BigInt(lt) >= (1n << 64n) || !/^[a-f0-9]{64}$/.test(hash) || !/^(?:0|-1):[a-f0-9]{64}$/.test(recipient)) throw new Error('INVALID_HINT');
  const reference = `${network}:${recipient}:${lt}:${hash}`;
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(reference))), b => b.toString(16).padStart(2, '0')).join('');
  return {eventKey: `hint_${digest}`, bodyDigest: digest, reference};
}
