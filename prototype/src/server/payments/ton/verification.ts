import type {TonAsset,TonInvoice,TonNetwork,VerifiedPaymentInput} from './store.ts';

/**
 * Internal projection returned only by a trusted, server-side chain adapter.
 * This is not a cryptographic proof and must never be populated from checkout
 * JSON, a wallet callback, webhook amounts or a client-supplied transaction hash.
 * The adapter fetches account transactions and their finality independently.
 */
export interface TonChainProof {
  network: TonNetwork;
  account: string;
  transactionHash: string;
  lt: string;
  transactionAt: number;
  successful: boolean;
  aborted: boolean;
  finalized: boolean;
  masterchainSeqno: number;
  outgoingMessageCount: number;
  asset: TonAsset;
  incoming: {
    bounced: boolean;
    source: string;
    destination: string;
    /** Native TON value or decoded jetton token amount, never forwarding gas. */
    amountBaseUnits: string;
    comment: string | null;
  };
  jetton?: {
    master: string;
    owner: string;
    wallet: string;
    /** Independently obtained with trustedMaster.get_wallet_address(owner). */
    derivedWallet: string;
    notificationSender: string;
    notificationOpcode: string;
    /** Credit of this transfer to the recipient jetton wallet was verified. */
    credited: boolean;
    creditTransactionHash: string;
  };
}

export interface TonVerificationPolicy {
  trustedJettonMasters: Readonly<Partial<Record<TonNetwork,readonly string[]>>>;
}
export const usdtMainnetMaster = '0:b113a994b5024a16719f69139328eb759596c38a25f59028b146fecdc3621dfe';
const defaultPolicy: TonVerificationPolicy = Object.freeze({trustedJettonMasters:Object.freeze({'ton-mainnet':Object.freeze([usdtMainnetMaster])})});
export type TonVerificationCode = 'MALFORMED_PROOF'|'NETWORK_MISMATCH'|'ASSET_MISMATCH'|'RECIPIENT_MISMATCH'|'NOT_SUCCESSFUL'|'NOT_FINALIZED'|'COMMENT_MISMATCH'|'UNTRUSTED_JETTON'|'INVALID_JETTON_CREDIT';
export class TonVerificationError extends Error {
  readonly code: TonVerificationCode;
  constructor(code: TonVerificationCode) {super(code);this.code=code;this.name='TonVerificationError';}
}
function reject(code:TonVerificationCode):never {throw new TonVerificationError(code);}
const rawAddress = (value:unknown):value is string => typeof value==='string'&&/^(?:0|-1):[a-f0-9]{64}$/.test(value);
const hash = (value:unknown):value is string => typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const timestamp = (value:unknown):value is number => Number.isSafeInteger(value)&&Number(value)>=0;
const amount = (value:unknown):value is string => typeof value==='string'&&/^[1-9]\d{0,36}$/.test(value)&&BigInt(value)<(1n<<120n);
const logicalTime = (value:unknown):value is string => typeof value==='string'&&/^[1-9]\d{0,19}$/.test(value)&&BigInt(value)<(1n<<64n);
const invoiceComment = (value:unknown):value is string => typeof value==='string'&&/^ts_[a-f0-9]{32}$/.test(value);
const object = (value:unknown):value is Record<string,unknown> => value!==null&&typeof value==='object'&&!Array.isArray(value);
async function sha256(value:string):Promise<string> {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}

/**
 * Validate one actual received transfer against exactly one server-owned invoice.
 * Amount/time discrepancies remain verified receipts: the persistence boundary
 * moves those invoices into review instead of discarding money already received.
 */
export async function verifyTonPayment(invoice:TonInvoice,proof:TonChainProof,observedAt:number,policy:TonVerificationPolicy=defaultPolicy):Promise<VerifiedPaymentInput> {
  if (!object(invoice)||!object(proof)||!object(proof.incoming)||!timestamp(observedAt)||!timestamp(proof.transactionAt)||proof.transactionAt>observedAt||!rawAddress(proof.account)||!hash(proof.transactionHash)||!logicalTime(proof.lt)||!amount(proof.incoming.amountBaseUnits)||!rawAddress(proof.incoming.source)||!rawAddress(proof.incoming.destination)||!rawAddress(invoice.recipient)||!invoiceComment(invoice.comment)||!timestamp(invoice.createdAt)||!timestamp(invoice.expiresAt)||invoice.createdAt>=invoice.expiresAt||!amount(invoice.amountBaseUnits)||typeof invoice.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(invoice.id)) reject('MALFORMED_PROOF');
  if (!['ton-mainnet','ton-testnet'].includes(proof.network)||proof.network!==invoice.network) reject('NETWORK_MISMATCH');
  if (!['TON','USDT'].includes(proof.asset)||proof.asset!==invoice.asset) reject('ASSET_MISMATCH');
  if (proof.account!==invoice.recipient||proof.incoming.destination!==invoice.recipient) reject('RECIPIENT_MISMATCH');
  if (proof.successful!==true||proof.aborted!==false||proof.incoming.bounced!==false||proof.outgoingMessageCount!==0) reject('NOT_SUCCESSFUL');
  if (proof.finalized!==true||!Number.isSafeInteger(proof.masterchainSeqno)||proof.masterchainSeqno<=0) reject('NOT_FINALIZED');
  if (!invoiceComment(proof.incoming.comment)||proof.incoming.comment!==invoice.comment) reject('COMMENT_MISMATCH');
  if (proof.asset==='TON') {
    if (invoice.jettonMaster!==null||proof.jetton!==undefined) reject('ASSET_MISMATCH');
  } else {
    const j=proof.jetton;
    const trusted=policy.trustedJettonMasters[proof.network]??[];
    if (!object(j)||!rawAddress(invoice.jettonMaster)||!trusted.includes(invoice.jettonMaster)||j.master!==invoice.jettonMaster) reject('UNTRUSTED_JETTON');
    if (!rawAddress(j.wallet)||!rawAddress(j.derivedWallet)||!rawAddress(j.notificationSender)||j.owner!==invoice.recipient||j.wallet!==j.derivedWallet||j.notificationSender!==j.wallet||proof.incoming.source!==j.wallet||j.notificationOpcode!=='0x7362d09c'||j.credited!==true||!hash(j.creditTransactionHash)) reject('INVALID_JETTON_CREDIT');
  }
  // Account + logical time + hash identifies the sole incoming message of this
  // account transaction. No sender ownership assumption is made (exchanges work).
  const txIdentity=`${proof.network}:${proof.account}:${proof.lt}:${proof.transactionHash}`;
  const eventKey=`ton_${await sha256(txIdentity)}`;
  const stableReceipt={network:proof.network,asset:proof.asset,account:proof.account,transactionHash:proof.transactionHash,lt:proof.lt,transactionAt:proof.transactionAt,incoming:{source:proof.incoming.source,destination:proof.incoming.destination,amountBaseUnits:proof.incoming.amountBaseUnits,comment:proof.incoming.comment},jetton:proof.jetton?{master:proof.jetton.master,owner:proof.jetton.owner,wallet:proof.jetton.wallet,creditTransactionHash:proof.jetton.creditTransactionHash}:null};
  const proofDigest=await sha256(JSON.stringify(stableReceipt));
  return {eventKey,txIdentity,invoiceId:invoice.id,asset:proof.asset,network:proof.network,recipient:proof.account,comment:proof.incoming.comment!,amountBaseUnits:proof.incoming.amountBaseUnits,transactionAt:proof.transactionAt,observedAt,proofDigest};
}
