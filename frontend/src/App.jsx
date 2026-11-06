import { createBrowserRouter, RouterProvider } from "react-router";
import { Layout } from "./components/Layout.jsx";
import Premarket from "./pages/Premarket.jsx";
import PremarketDetails from "./pages/PremarketDetails.jsx";
import Otc from "./pages/Otc.jsx";
import OtcDetails from "./pages/OtcDetails.jsx";
import Broker from "./pages/Broker.jsx";
import Deal from "./pages/Deal.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Create from "./pages/Create.jsx";
import Admin from "./pages/Admin.jsx";
import Settings from "./pages/Settings.jsx";
import NotFound from "./pages/NotFound.jsx";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Premarket /> },
      { path: "premarket/:key", element: <PremarketDetails /> },
      { path: "otc", element: <Otc /> },
      { path: "otc/:key", element: <OtcDetails /> },
      { path: "broker", element: <Broker /> },
      { path: "deal/:key", element: <Deal /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "create", element: <Create /> },
      { path: "admin", element: <Admin /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
