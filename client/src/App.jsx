import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Outlet } from "react-router-dom";
import UnsavedNavigationGuard from "./components/common/UnsavedNavigationGuard";
import StoreErrorBoundary from "./components/common/StoreErrorBoundary";
import RouteExperience from "./components/common/RouteExperience";
import CartProvider from "./context/CartProvider";
import RealtimeBridge from "./components/common/RealtimeBridge";
import BrandingProvider from "./context/BrandingProvider";
import AdminBranding from "./pages/admin/AdminBranding";
import AdminFooter from "./pages/admin/AdminFooter";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminStorefrontCopy from "./pages/admin/AdminStorefrontCopy";
import AddProduct from "./pages/admin/AddProduct";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBanners from "./pages/admin/AdminBanners";
import EditProduct from "./pages/admin/EditProduct";
import CustomerLogin from "./pages/auth/CustomerLogin";
import CustomerSignup from "./pages/auth/CustomerSignup";
import VerifyOTP from "./pages/auth/VerifyOTP";
import PasswordRecovery from "./pages/auth/PasswordRecovery";
import CartPage from "./pages/customer/CartPage";
import Checkout from "./pages/customer/Checkout";
import Addresses from "./pages/customer/Addresses";
import AdminCheckoutSettings from "./pages/admin/AdminCheckoutSettings";
import Orders from "./pages/customer/Orders";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminFeatured from "./pages/admin/AdminFeatured";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminDelivery from './pages/admin/AdminDelivery';
import AdminFinance from './pages/admin/AdminFinance';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import DeliveryLogin from './pages/delivery/DeliveryLogin';
import Wishlist from "./pages/customer/Wishlist";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import Home from "./pages/customer/Home";
import Compare from "./pages/customer/Compare";
import Faq from "./pages/public/Faq";
import AdminReviews from "./pages/admin/AdminReviews";
import ProductDetails from "./pages/customer/ProductDetails";
import ProductList from "./pages/customer/ProductList";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import StorePolicy from "./pages/public/StorePolicy";
import NewsletterPreferences from "./pages/public/NewsletterPreferences";
import NotFound from "./pages/public/NotFound";
import Categories from "./pages/customer/Categories";














































const appRouter=createBrowserRouter(createRoutesFromElements(<Route element={<><RouteExperience/><UnsavedNavigationGuard/><Outlet/></>}>
    <Route path="/" element={<Home />} />
    <Route path="/signup" element={<CustomerSignup />} />
    <Route path="/verify-otp" element={<VerifyOTP />} />
    <Route path="/login" element={<CustomerLogin />} />
    <Route path="/forgot-password" element={<PasswordRecovery />} />
    <Route path="/reset-password" element={<PasswordRecovery reset />} />
    <Route path="/dashboard" element={<CustomerDashboard />} />
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin/dashboard" element={<AdminDashboard />} />
    <Route path="/admin/products" element={<AdminProducts />} />
    <Route path="/admin/products/new" element={<AddProduct />} />
    <Route path="/admin/products/:id/edit" element={<EditProduct />} />
    <Route path="/admin/customers" element={<AdminCustomers />} />
    <Route path="/admin/categories" element={<AdminCategories />} />
    <Route path="/admin/banners" element={<AdminBanners />} />
    <Route path="/admin/orders" element={<AdminOrders />} />
    <Route path="/admin/delivery" element={<AdminDelivery />} />
    <Route path="/admin/finance" element={<AdminFinance />} />
    <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
    <Route path="/delivery/login" element={<DeliveryLogin />} />
    <Route path="/admin/products/:id/preview" element={<ProductDetails adminPreview />} />
    <Route path="/admin/featured" element={<AdminFeatured />} />
    <Route path="/admin/inventory" element={<AdminInventory />} />
    <Route path="/admin/analytics" element={<AdminAnalytics />} />
    <Route path="/admin/settings" element={<AdminCheckoutSettings />} />
    <Route path="/admin/branding" element={<AdminBranding />} />
    <Route path="/admin/footer" element={<AdminFooter />} />
    <Route path="/admin/coupons" element={<AdminCoupons />} />
    <Route path="/admin/storefront-copy" element={<AdminStorefrontCopy />} />
    <Route path="/products" element={<ProductList />} />
    <Route path="/products/:id" element={<ProductDetails />} />
    <Route path="/categories" element={<Categories />} />
    <Route path="/categories/:slug" element={<ProductList />} />
    <Route path="/cart" element={<CartPage />} />
    <Route path="/checkout" element={<Checkout />} />
    <Route path="/addresses" element={<Addresses />} />
    <Route path="/orders" element={<Orders />} />
    <Route path="/wishlist" element={<Wishlist />} />
    <Route path="/compare" element={<Compare />} />
    <Route path="/faq" element={<Faq />} />
    <Route path="/admin/reviews" element={<AdminReviews />} />
    <Route path="/about" element={<About />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/terms" element={<StorePolicy kind="terms" />} />
    <Route path="/privacy" element={<StorePolicy kind="privacy" />} />
    <Route path="/returns-refunds" element={<StorePolicy kind="refunds" />} />
    <Route path="/shipping-policy" element={<StorePolicy kind="shipping" />} />
    <Route path="/newsletter/confirm" element={<NewsletterPreferences />} />
    <Route path="/newsletter/unsubscribe" element={<NewsletterPreferences action="unsubscribe" />} />
    <Route path="*" element={<NotFound />} />
  </Route>));
export default function App() {
 return <StoreErrorBoundary><BrandingProvider><CartProvider><RealtimeBridge/><RouterProvider router={appRouter}/></CartProvider></BrandingProvider></StoreErrorBoundary>;
}
