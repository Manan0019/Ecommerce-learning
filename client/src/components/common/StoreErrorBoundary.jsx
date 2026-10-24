import { Button } from "../ui/index";
import { Component } from "react";
import UiIcon from "./UiIcon";

/** Prevent a failed optional widget from leaving the entire storefront blank.
 * This is a last-resort view; it does not hide errors during development. */
export default class StoreErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error("Nexora interface error:", error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="nx37-error-screen" role="alert">
      <div className="nx37-error-panel"><span aria-hidden="true">✦</span><p>THE NEXORA EDIT</p><h1>This page needs a refresh.</h1>
        <p>We couldn't display this screen. Your account and orders haven't been changed by this message.</p>
        <div><Button variant="secondary" type="button" onClick={() => window.location.reload()}>Try again</Button><a href="/">Go to homepage <UiIcon name="chevron-right" size={17}/></a></div>
      </div>
    </main>;
  }
}
