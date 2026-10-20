import StoreFooter from "./StoreFooter";
import StoreHeader from "./StoreHeader";

export default function CustomerLayout({ children, mainClassName }) {
  return <div className="storefront">
    <a className="nx37-skip-link" href="#main-content">Skip to content</a>
    <StoreHeader />
    <main id="main-content" className={mainClassName}>{children}</main>
    <StoreFooter />
  </div>;
}
