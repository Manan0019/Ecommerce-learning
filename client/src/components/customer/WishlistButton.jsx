import { Button } from "../ui/index";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../../services/authService";
import {
  addWishlist,
  getWishlist,
  removeWishlist,
} from "../../services/wishlistService";
export default function WishlistButton({ productId }) {
  const [status, setStatus] = useState("loading");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function init() {
      try {
        const auth = await getCurrentUser(controller.signal);
        if (auth.user?.role !== "customer") {
          setStatus("login");
          return;
        }
        const result = await getWishlist(controller.signal);
        if (!controller.signal.aborted) {
          setSaved(
            result.products?.some((p) => String(p.id) === String(productId)) ??
              false,
          );
          setStatus("ready");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setStatus(err.status === 401 ? "login" : "error");
          setError(err.status === 401 ? "" : err.message);
        }
      }
    }
    init();
    return () => controller.abort();
  }, [productId]);
  async function toggle() {
    setStatus("saving");
    setError("");
    try {
      if (saved) await removeWishlist(productId);
      else await addWishlist(productId);
      setSaved(!saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus("ready");
    }
  }
  if (status === "login")
    return (
      <Button as={Link} variant="secondary"  to="/login">
        ♡ Sign in to save
      </Button>
    );
  return (
    <span className="wishlist-action">
      <Button variant="secondary"
        
        type="button"
        disabled={status !== "ready"}
        onClick={toggle}
        aria-pressed={saved}
      >
        {saved ? "♥ Saved to wishlist" : "♡ Save to wishlist"}
      </Button>
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
