import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import ApplicationList from "@/pages/application/List";
import ApplicationNew from "@/pages/application/New";
import ApplicationDetail from "@/pages/application/Detail";
import DispatchShelf from "@/pages/dispatch/ShelfView";
import DispatchOutbound from "@/pages/dispatch/Outbound";
import DispatchInventory from "@/pages/dispatch/Inventory";
import ReturnReceive from "@/pages/return/Receive";
import ReturnReading from "@/pages/return/Reading";
import ReturnConfirm from "@/pages/return/Confirm";
import ReturnOverdue from "@/pages/return/Overdue";
import { useEffect } from "react";
import { useStore } from "@/store";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Layout>
        <Navigate to="/dashboard" replace />
      </Layout>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <Layout>
        <Dashboard />
      </Layout>
    ),
  },
  {
    path: "/application",
    element: (
      <Layout>
        <ApplicationList />
      </Layout>
    ),
  },
  {
    path: "/application/new",
    element: (
      <Layout>
        <ApplicationNew />
      </Layout>
    ),
  },
  {
    path: "/application/:id",
    element: (
      <Layout>
        <ApplicationDetail />
      </Layout>
    ),
  },
  {
    path: "/dispatch",
    element: (
      <Layout>
        <DispatchShelf />
      </Layout>
    ),
  },
  {
    path: "/dispatch/outbound",
    element: (
      <Layout>
        <DispatchOutbound />
      </Layout>
    ),
  },
  {
    path: "/dispatch/inventory",
    element: (
      <Layout>
        <DispatchInventory />
      </Layout>
    ),
  },
  {
    path: "/return/receive",
    element: (
      <Layout>
        <ReturnReceive />
      </Layout>
    ),
  },
  {
    path: "/return/reading",
    element: (
      <Layout>
        <ReturnReading />
      </Layout>
    ),
  },
  {
    path: "/return/confirm",
    element: (
      <Layout>
        <ReturnConfirm />
      </Layout>
    ),
  },
  {
    path: "/return/overdue",
    element: (
      <Layout>
        <ReturnOverdue />
      </Layout>
    ),
  },
  {
    path: "*",
    element: (
      <Layout>
        <Navigate to="/dashboard" replace />
      </Layout>
    ),
  },
]);

function AppContent() {
  const checkOverdue = useStore((s) => s.checkOverdue);

  useEffect(() => {
    checkOverdue();
    const timer = setInterval(checkOverdue, 60 * 1000);
    return () => clearInterval(timer);
  }, [checkOverdue]);

  return <RouterProvider router={router} />;
}

export default AppContent;
