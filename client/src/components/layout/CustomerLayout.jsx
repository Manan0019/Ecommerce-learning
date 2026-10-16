import StoreFooter from "./StoreFooter";
import StoreHeader from "./StoreHeader";

export default function CustomerLayout({ children, mainClassName }) {
  return <div className="storefront">
    <StoreHeader />
    <main className={mainClassName}>{children}</main>
    <StoreFooter />
  </div>;
}
