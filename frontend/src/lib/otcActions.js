import { erc20Abi, parseEventLogs, parseUnits, zeroAddress } from "viem";
import { readContract, switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { ExpirationTime } from "@arkiv-network/sdk";
import { addr, dec, u64 } from "@arkiv-network/sdk/schema";
import { arcTestnet } from "../config/wagmi.js";
import { settings } from "../config/env.js";
import { OTC_ABI } from "../contracts/otc.js";
import { OtcOrder } from "../arkiv/schemas.js";
import { getArkivWallet } from "../arkiv/wallet.js";
import { arkivExplorer } from "../arkiv/client.js";
import { arcExplorer } from "./format.js";
import { mulToUnits } from "./amounts.js";
import { switchAndWait } from "./chain.js";

export const CREATE_STEPS = [
  { id: "approve", label: "Approve token", chain: "Arc" },
  { id: "create", label: "Lock tokens in escrow", chain: "Arc" },
  { id: "publish", label: "Publish listing to the order book", chain: "Arkiv" },
];

/**
 * Creates an OTC order: approve → createOrder on Arc (escrow) → Arkiv listing
 * owned by the maker that expires at the deadline.
 * `set(stepId, patch)` reports progress; throws with `err.step` set on failure.
 *
 * side "sell": offer `amount` of base, want amount×price of quote.
 * side "buy":  offer amount×price of quote, want `amount` of base.
 */
export async function createOtcOrder(config, p, set) {
  let step = "approve";
  try {
    await switchAndWait(config, arcTestnet.id);
    const decimalsOf = (token) => readContract(config, { chainId: arcTestnet.id, address: token, abi: erc20Abi, functionName: "decimals" });
    const [baseDecimals, quoteDecimals] = await Promise.all([decimalsOf(p.base), decimalsOf(p.quote)]);
    const baseUnits = parseUnits(p.amount, baseDecimals);
    const quoteUnits = mulToUnits(p.amount, p.price, quoteDecimals);
    const [offerToken, offerAmount, wantToken, wantAmount] =
      p.side === "sell" ? [p.base, baseUnits, p.quote, quoteUnits] : [p.quote, quoteUnits, p.base, baseUnits];

    set("approve", { status: "active" });
    const balance = await readContract(config, { chainId: arcTestnet.id, address: offerToken, abi: erc20Abi, functionName: "balanceOf", args: [p.maker] });
    if (balance < offerAmount) throw new Error("Insufficient balance for this order");
    const allowance = await readContract(config, {
      chainId: arcTestnet.id, address: offerToken, abi: erc20Abi, functionName: "allowance", args: [p.maker, settings.arc.otc],
    });
    if (allowance < offerAmount) {
      const hash = await writeContract(config, {
        chainId: arcTestnet.id, address: offerToken, abi: erc20Abi, functionName: "approve", args: [settings.arc.otc, offerAmount],
      });
      await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash });
      set("approve", { status: "done", link: arcExplorer.tx(hash) });
    } else {
      set("approve", { status: "skipped", label: "Approve token (already approved)" });
    }

    step = "create";
    set("create", { status: "active" });
    const createHash = await writeContract(config, {
      chainId: arcTestnet.id,
      address: settings.arc.otc,
      abi: OTC_ABI,
      functionName: "createOrder",
      args: [{
        offerToken, offerAmount, wantToken, wantAmount,
        partialAllowed: p.partial,
        deadline: BigInt(p.deadline),
        privateTaker: p.privateTaker ?? zeroAddress,
        broker: p.broker ?? zeroAddress,
        brokerFeeBps: p.brokerFeeBps ?? 0,
      }],
    });
    const receipt = await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash: createHash });
    const [created] = parseEventLogs({ abi: OTC_ABI, eventName: "OrderCreated", logs: receipt.logs });
    if (!created) throw new Error("Order created but no OrderCreated event was found");
    const orderId = created.args.orderId;
    set("create", { status: "done", link: arcExplorer.tx(createHash) });

    step = "publish";
    // The order is already escrowed on Arc; publishing can be retried on its own.
    const publish = async () => {
    set("publish", { status: "active" });
    const arkiv = await getArkivWallet(config);
    const { entityKey, txHash } = await arkiv.createEntity(
      OtcOrder,
      {
        maker: addr(p.maker),
        side: p.side,
        offerToken: addr(offerToken),
        wantToken: addr(wantToken),
        price: dec(p.price),
        amount: dec(p.amount),
        partial: p.partial,
        orderId: u64(orderId),
        deadline: u64(BigInt(p.deadline)),
        arcTx: createHash,
        ...(p.makerEns ? { makerEns: p.makerEns } : {}),
        ...(p.broker ? { broker: addr(p.broker) } : {}),
        ...(p.brokerEns ? { brokerEns: p.brokerEns } : {}),
      },
      { expiration: ExpirationTime.atDate(new Date(p.deadline * 1000)) },
    );
    set("publish", { status: "done", link: arkivExplorer.tx(txHash) });
    await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
    return { entityKey, orderId: orderId.toString() };
    };
    try {
      return await publish();
    } catch (err) {
      err.retry = publish;
      throw err;
    }
  } catch (err) {
    err.step = step;
    throw err;
  }
}
