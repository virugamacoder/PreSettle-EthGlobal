import { PageHeader, EmptyState } from "../components/PageHeader.jsx";

export default function Broker() {
  return (
    <>
      <PageHeader title="Broker deals" description="Deals arranged by verified ENS brokers." />
      <EmptyState title="Coming soon" />
    </>
  );
}
