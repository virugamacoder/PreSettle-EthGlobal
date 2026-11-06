import { PageHeader, EmptyState } from "../components/PageHeader.jsx";

export default function Dashboard() {
  return (
    <>
      <PageHeader title="Dashboard" description="Your orders, offers, fills and withdrawable balances." />
      <EmptyState title="Coming soon" />
    </>
  );
}
