import { Link } from "react-router";
import { EmptyState } from "../components/PageHeader.jsx";

export default function NotFound() {
  return (
    <EmptyState title="Page not found">
      <Link to="/" className="text-accent hover:underline">Back to Premarket</Link>
    </EmptyState>
  );
}
