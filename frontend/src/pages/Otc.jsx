import { PageHeader, EmptyState } from "../components/PageHeader.jsx";

export default function Otc() {
  return (
    <>
      <PageHeader title="OTC market" description="Peer-to-peer token deals in escrow on Arc. Listings live on Arkiv and expire at their deadline." />
      <EmptyState title="Coming soon" />
    </>
  );
}
