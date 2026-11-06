import { PageHeader, EmptyState } from "../components/PageHeader.jsx";

export default function Admin() {
  return (
    <>
      <PageHeader title="Admin" description="Markets, token list and broker licenses." />
      <EmptyState title="Coming soon" />
    </>
  );
}
