import banner1 from "../assets/images/BannerBg1.png";
import banner2 from "../assets/images/BannerBg2.png";
import banner3 from "../assets/images/BannerBg3.png";
import banner4 from "../assets/images/BannerBg4.png";
import { timeLeft } from "../lib/format.js";

const BANNERS = [banner1, banner2, banner3, banner4];

/** Round token badge: the token logo if there is one, otherwise its initials. */
export function TokenAvatar({ symbol, logo, size = "h-12 w-12", text = "text-base" }) {
  if (logo) return <img src={logo} alt="" className={`${size} rounded-full object-cover`} />;
  return (
    <span className={`${size} ${text} grid shrink-0 place-items-center rounded-full bg-brand-gradient font-bold text-accent-ink`}>
      {(symbol || "?").slice(0, 3).toUpperCase()}
    </span>
  );
}

/**
 * Featured pre-launch tokens in the original banner style: a patterned card,
 * the token badge in a round frame, and its name on a label at the bottom.
 * `items`: [{ symbol, offers, tge, logo? }]
 */
export function TokenBanners({ items, selected, onSelect }) {
  if (!items.length) return null;
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.slice(0, 4).map((item, i) => (
        <button
          key={item.symbol}
          type="button"
          onClick={() => onSelect(selected === item.symbol ? "" : item.symbol)}
          aria-pressed={selected === item.symbol}
          className={`relative h-44 overflow-hidden rounded-3xl text-left transition-transform hover:-translate-y-0.5 ${
            selected === item.symbol ? "ring-2 ring-accent ring-offset-2 ring-offset-page" : ""
          }`}
        >
          <img src={BANNERS[i % BANNERS.length]} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute left-1/2 top-6 grid h-[90px] w-[90px] -translate-x-1/2 place-items-center rounded-full bg-surface">
            <TokenAvatar symbol={item.symbol} logo={item.logo} size="h-[76px] w-[76px]" text="text-xl" />
          </span>
          <span className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between rounded-md bg-surface px-3.5 py-1.5">
            <span className="font-semibold text-ink">{item.symbol}</span>
            <span className="text-xs font-medium text-muted">
              {item.offers} offer{item.offers === 1 ? "" : "s"} · {item.tge > Date.now() / 1000 ? `TGE ${timeLeft(item.tge)}` : "TGE passed"}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
