import { PageHeader, EmptyState } from "../components/PageHeader.jsx";

export default function OtcDetails() {
  return (
    <>
      <PageHeader title="Order details" description="Escrowed OTC order." />
      <EmptyState title="Coming soon" />
    </>
  );
}
