import { useState } from "react";
import { PageHeader, EmptyState } from "../components/PageHeader.jsx";
import { CreateOtcForm } from "../components/CreateOtcForm.jsx";

const TABS = [
  { id: "otc", label: "OTC order" },
  { id: "premarket", label: "Premarket offer" },
];

export default function Create() {
  const [tab, setTab] = useState("otc");

  return (
    <>
      <PageHeader title="Create" description="Lock your side of the deal in escrow on Arc and publish the listing to the Arkiv order book." />
      <div className="mb-6 flex gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "otc" ? <CreateOtcForm /> : <EmptyState title="Premarket offers are coming next" />}
    </>
  );
}
