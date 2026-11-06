import { useSearchParams } from "react-router";
import { PageHeader, PillTabs } from "../components/PageHeader.jsx";
import { CreateOtcForm } from "../components/CreateOtcForm.jsx";
import { CreatePremarketForm } from "../components/CreatePremarketForm.jsx";

const TABS = [
  { id: "otc", label: "OTC order" },
  { id: "premarket", label: "Premarket offer" },
];

export default function Create() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "premarket" ? "premarket" : "otc";

  return (
    <>
      <PageHeader title="Create" description="Lock your side of the deal in escrow on Arc and publish the listing to the Arkiv order book." />
      <div className="mb-6">
        <PillTabs
          tabs={TABS.map((x) => ({ value: x.id, label: x.label }))}
          value={tab}
          onChange={(id) => setParams(id === "otc" ? {} : { tab: id })}
          label="What to create"
        />
      </div>
      {tab === "otc" ? <CreateOtcForm initialSide={params.get("side")} /> : <CreatePremarketForm />}
    </>
  );
}
