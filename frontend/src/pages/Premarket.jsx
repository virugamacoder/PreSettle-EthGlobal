import { PageHeader, EmptyState } from "../components/PageHeader.jsx";

export default function Premarket() {
  return (
    <>
      <PageHeader title="Premarket" description="Trade tokens before they launch. Sellers lock USDC collateral; if they don't deliver after TGE, buyers receive it." />
      <EmptyState title="Coming soon" />
    </>
  );
}
