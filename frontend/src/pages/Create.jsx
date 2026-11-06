import { PageHeader, EmptyState } from "../components/PageHeader.jsx";

export default function Create() {
  return (
    <>
      <PageHeader title="Create" description="Create an OTC order or a premarket offer." />
      <EmptyState title="Coming soon" />
    </>
  );
}
