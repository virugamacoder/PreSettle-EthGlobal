import { PageHeader, EmptyState } from "../components/PageHeader.jsx";

export default function Deal() {
  return (
    <>
      <PageHeader title="Broker deal" description="Review and approve a deal your broker prepared for you." />
      <EmptyState title="Coming soon" />
    </>
  );
}
