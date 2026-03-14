import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/home";
import Maintenance from "@/pages/maintenance";
import Pay from "@/pages/pay";
import Apply from "@/pages/apply";
import PropertyPage from "@/pages/property";
import NotFound from "@/pages/not-found";

import { PortalLayout } from "@/components/layout/portal-layout";
import PortalDashboard from "@/pages/portal/dashboard";
import PortalPayments from "@/pages/portal/payments";
import PortalMaintenance from "@/pages/portal/maintenance-portal";
import PortalApplications from "@/pages/portal/applications-portal";
import AccountSettings from "@/pages/portal/account-settings";

import AdminLogin from "@/pages/admin-login";
import InvitePage from "@/pages/invite";
import ChangePassword from "@/pages/admin/change-password";
import { AdminLayout } from "@/components/layout/admin-layout";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminEntities from "@/pages/admin/entities";
import AdminEntityDetail from "@/pages/admin/entity-detail";
import AdminProperties from "@/pages/admin/properties";
import AdminPropertyDetail from "@/pages/admin/property-detail";
import AdminTenants from "@/pages/admin/tenants";
import AdminDocuments from "@/pages/admin/documents";
import AdminMaintenance from "@/pages/admin/maintenance-admin";
import AdminUsers from "@/pages/admin/users";
import AdminStaff from "@/pages/admin/staff";
import LeaseDocumentEditor from "@/pages/admin/lease-document-editor";
import AdminPropertyImages from "@/pages/admin/property-images";
import AdminExpenses from "@/pages/admin/expenses";
import AdminRentCharges from "@/pages/admin/rent-charges";
import AdminReports from "@/pages/admin/reports";
import AdminMessaging from "@/pages/admin/messaging";
import SignLease from "@/pages/sign-lease";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/pay" component={Pay} />
      <Route path="/apply" component={Apply} />
      <Route path="/property/:propertyCode" component={PropertyPage} />
      
      <Route path="/portal">
        <PortalLayout>
          <PortalDashboard />
        </PortalLayout>
      </Route>
      <Route path="/portal/payments">
        <PortalLayout>
          <PortalPayments />
        </PortalLayout>
      </Route>
      <Route path="/portal/maintenance">
        <PortalLayout>
          <PortalMaintenance />
        </PortalLayout>
      </Route>
      <Route path="/portal/lease">
        <PortalLayout>
          <PortalApplications />
        </PortalLayout>
      </Route>
      <Route path="/portal/settings">
        <PortalLayout>
          <AccountSettings />
        </PortalLayout>
      </Route>
      
      <Route path="/invite/:token" component={InvitePage} />
      <Route path="/sign-lease/:token" component={SignLease} />
      
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/change-password" component={ChangePassword} />
      <Route path="/admin/dashboard">
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </Route>
      <Route path="/admin/entities">
        <AdminLayout>
          <AdminEntities />
        </AdminLayout>
      </Route>
      <Route path="/admin/entities/:id">
        <AdminLayout>
          <AdminEntityDetail />
        </AdminLayout>
      </Route>
      <Route path="/admin/properties">
        <AdminLayout>
          <AdminProperties />
        </AdminLayout>
      </Route>
      <Route path="/admin/properties/:id">
        <AdminLayout>
          <AdminPropertyDetail />
        </AdminLayout>
      </Route>
      <Route path="/admin/tenants">
        <AdminLayout>
          <AdminTenants />
        </AdminLayout>
      </Route>
      <Route path="/admin/documents">
        <AdminLayout>
          <AdminDocuments />
        </AdminLayout>
      </Route>
      <Route path="/admin/lease-document/:id">
        <AdminLayout>
          <LeaseDocumentEditor />
        </AdminLayout>
      </Route>
      <Route path="/admin/property-images">
        <AdminLayout>
          <AdminPropertyImages />
        </AdminLayout>
      </Route>
      <Route path="/admin/expenses">
        <AdminLayout>
          <AdminExpenses />
        </AdminLayout>
      </Route>
      <Route path="/admin/rent-charges">
        <AdminLayout>
          <AdminRentCharges />
        </AdminLayout>
      </Route>
      <Route path="/admin/reports">
        <AdminLayout>
          <AdminReports />
        </AdminLayout>
      </Route>
      <Route path="/admin/leases">
        <Redirect to="/admin/documents" replace />
      </Route>
      <Route path="/admin/files">
        <Redirect to="/admin/documents?tab=files" replace />
      </Route>
      <Route path="/admin/messaging">
        <AdminLayout>
          <AdminMessaging />
        </AdminLayout>
      </Route>
      <Route path="/admin/maintenance">
        <AdminLayout>
          <AdminMaintenance />
        </AdminLayout>
      </Route>
      <Route path="/admin/users">
        <AdminLayout>
          <AdminUsers />
        </AdminLayout>
      </Route>
      <Route path="/admin/staff">
        <AdminLayout>
          <AdminStaff />
        </AdminLayout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
