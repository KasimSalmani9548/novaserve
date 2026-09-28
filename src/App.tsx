import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/store';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';

import { Login } from './pages/auth/Login';
import { AdminAadhaarPvc } from './pages/admin/AadhaarPvc';
import { Transactions } from './pages/customer/Transactions';
import { AadhaarPvc } from './pages/customer/AadhaarPvc';
import { TrackPan } from './pages/customer/TrackPan';

import { Register } from './pages/auth/Register';

import { CustomerDashboard } from './pages/customer/Dashboard';
import { CustomerServices } from './pages/customer/Services';
import { ServiceDetail } from './pages/customer/ServiceDetail';
import { CustomerOrders } from './pages/customer/Orders';
import { OrderDetail } from './pages/customer/OrderDetail';
import { AdminTopups } from './pages/admin/Topups';
import { CustomerWallet } from './pages/customer/Wallet';
import { PanFind } from './pages/customer/PanFind';
import { Notifications } from './pages/customer/Notifications';
import { Profile } from './pages/customer/Profile';
import { Support } from './pages/customer/Support';

import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminCustomers } from './pages/admin/Customers';
import { AdminServices } from './pages/admin/Services';
import { AdminCategories } from './pages/admin/Categories';
import { AdminOrders } from './pages/admin/Orders';
import { AdminOrderDetail } from './pages/admin/OrderDetail';
import { AdminManage } from './pages/admin/Manage';
import { AdminWallet } from './pages/admin/Wallet';
import { AdminPanFinds } from './pages/admin/PanFinds';
import { AdminSupport } from './pages/admin/Support';
import { AdminPricing } from './pages/admin/Pricing';
import { AdminSettings } from './pages/admin/Settings';

function Guard({ children, role }: { children: React.ReactNode; role?: 'ADMIN' | 'CUSTOMER' }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner className="text-emerald-500" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/app/dashboard'} replace />;
  return <>{children}</>;
}

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner className="text-emerald-500" /></div>;
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/app/dashboard'} replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/register" element={<Register />} />

          <Route path="/app" element={<Guard role="CUSTOMER"><Layout /></Guard>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="services" element={<CustomerServices />} />
            <Route path="services/:id" element={<ServiceDetail />} />
            <Route path="orders" element={<CustomerOrders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="wallet" element={<CustomerWallet />} />
	    <Route path="pan-find" element={<PanFind />} />
            <Route path="transactions" element={<Transactions />} />
	    <Route path="aadhaar-pvc" element={<AadhaarPvc />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="support" element={<Support />} />
          </Route>

          <Route path="/admin" element={<Guard role="ADMIN"><Layout /></Guard>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />            <Route path="manage" element={<AdminManage />} />
            <Route path="wallet" element={<AdminWallet />} />
	    <Route path="pan-finds" element={<AdminPanFinds />} />
            <Route path="aadhaar-pvc" element={<AdminAadhaarPvc />} />
            <Route path="topups" element={<AdminTopups />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="pricing" element={<AdminPricing />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

