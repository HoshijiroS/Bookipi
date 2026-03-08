import { useEffect, useState } from "react";
import {
  checkout,
  fetchProducts,
  formatMoney,
  type Product,
  fetchFlashSaleConfig,
  updateFlashSaleConfig,
  fetchFlashSaleStatus,
  type FlashSaleStatus
} from "./api";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [userId, setUserId] = useState("user_123");
  const [checkingOut, setCheckingOut] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);

  const [purchaseStatus, setPurchaseStatus] = useState<
    "" | "success" | "out_of_stock" | "sale_ended" | "error"
  >("");

  
  const [flashSaleLoading, setFlashSaleLoading] = useState(false);
  const [flashSaleSaving, setFlashSaleSaving] = useState(false);
  const [flashSaleError, setFlashSaleError] = useState<string>("");
  const [flashSaleStatusError, setFlashSaleStatusError] = useState<string>("");
  const [flashSaleMessage, setFlashSaleMessage] = useState<string>("");
  const [flashSaleStatus, setFlashSaleStatus] = useState<string | null>(null);
  const [flashStartLocal, setFlashStartLocal] = useState<string>("");
  const [flashEndLocal, setFlashEndLocal] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const p = await fetchProducts();
        if (!alive) return;
        setProducts(p);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load products");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setFlashSaleLoading(true);
        setFlashSaleError("");
        const config = await fetchFlashSaleConfig();
        if (!alive) return;
        if (config.start) {
          setFlashStartLocal(toDateTime(config.start));
        }
        if (config.end) {
          setFlashEndLocal(toDateTime(config.end));
        }
      } catch (e) {
        if (!alive) return;
        setFlashSaleError(e instanceof Error ? e.message : "Failed to load flash sale config");
      } finally {
        if (!alive) return;
        setFlashSaleLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setFlashSaleLoading(true);
        setFlashSaleStatusError("");
        const status = await fetchFlashSaleStatus();
        if (!alive) return;
        
        displayFlashSaleStatus(status);
      } catch (e) {
        if (!alive) return;
        setFlashSaleStatusError(e instanceof Error ? e.message : "Failed to load flash sale status");
      } finally {
        if (!alive) return;
        setFlashSaleLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function onBuyNow(productId: string) {
    setError("");
    setLastOrderId(null);
    setPurchaseStatus("");
    if (!userId.trim()) {
      setError("userId is required");
      return;
    }

    try {
      const status = await fetchFlashSaleStatus();
      if (status.status !== "active") {
        setPurchaseStatus("sale_ended");
        setError("The flash sale has ended.");
        return;
      }
    } catch (e) {
      // Ignore status errors and continue; checkout will surface any problems
    }

    const items = [{ productId, quantity: 1 as const }];

    setCheckingOut(true);
    try {
      const res = await checkout({ userId: userId.trim(), items });
      setLastOrderId(res.order.id);
      setPurchaseStatus("success");
      setProducts(await fetchProducts());
    } catch (e) {
      const message = e instanceof Error ? e.message : "Checkout failed";
      if (typeof message === "string" && message.includes("insufficient stock")) {
        setPurchaseStatus("out_of_stock");
      } else {
        setPurchaseStatus("error");
      }
      setError(message);
    } finally {
      setCheckingOut(false);
    }
  }

  function toDateTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function toLocalTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";

    const date = d.toLocaleDateString();
    const time = d.toLocaleTimeString()
    return `${date} ${time}`;  
  }

  function toISODate(value: string): string | null {
    if (!value.trim()) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  async function onSaveFlashSale() {
    setFlashSaleError("");
    setFlashSaleMessage("");
    const startIso = toISODate(flashStartLocal);
    const endIso = toISODate(flashEndLocal);

    if (startIso === null && endIso === null) {
      setFlashSaleSaving(true);
      try {
        const config = await updateFlashSaleConfig({ start: null, end: null });
        if (config.start === null && config.end === null) {
          setFlashStartLocal("");
          setFlashEndLocal("");
        }
        setFlashSaleMessage("Flash sale cleared.");
      } catch (e) {
        setFlashSaleError(e instanceof Error ? e.message : "Failed to save flash sale");
      } finally {
        setFlashSaleSaving(false);
      }
      return;
    }

    if (!startIso || !endIso) {
      setFlashSaleError("Please provide valid start and end times, or clear both.");
      return;
    }

    if (new Date(startIso) >= new Date(endIso)) {
      setFlashSaleError("Start time must be before end time.");
      return;
    }

    setFlashSaleSaving(true);
    try {
      await updateFlashSaleConfig({ start: startIso, end: endIso });
      setFlashSaleMessage("Flash sale updated.");
    } catch (e) {
      setFlashSaleError(e instanceof Error ? e.message : "Failed to save flash sale");
    } finally {
      setFlashSaleSaving(false);
    }
  }

  function displayFlashSaleStatus(sale: FlashSaleStatus | null): void {
    if (!sale) {
      setFlashSaleStatus(null);
      return;
    }

    let startDate = sale.start ? toLocalTime(sale.start) : null;
    let endDate = sale.end ? toLocalTime(sale.end) : null;

    switch (sale.status) {
      case 'active': 
        if (startDate) {
          setFlashSaleStatus(`Flash sale active until ${startDate}`);
          break;
        }

        setFlashSaleStatus('Active');
        break;

      case 'upcoming':
        if (endDate) {
          setFlashSaleStatus(`Flash sale active until ${endDate}`);
          break;
        }

        setFlashSaleStatus('Upcoming');
        break;

      case 'ended': 
        if (endDate) {
          setFlashSaleStatus(`Flash sale ended last ${endDate}`);
          break;
        }

        setFlashSaleStatus('Ended');
        break;
      
      default: 
        setFlashSaleStatus(null); 
        break;
    }
  }

  async function onRefreshStatus() {
    try {
      setFlashSaleLoading(true);
      setFlashSaleStatusError("");
      const status = await fetchFlashSaleStatus();
      displayFlashSaleStatus(status);
    } catch (e) {
      setFlashSaleStatusError(e instanceof Error ? e.message : "Failed to fetch latest flash sale status");
    } finally {
      setFlashSaleLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="title">Bookipi</div>
          <div className="subtitle">Checkout</div>
        </div>
        <div className="user">
          <label className="label">User ID</label>
          <input 
            value={userId} 
            onChange={(e) => {
              setError("");
              setUserId(e.target.value)
            }}
            placeholder="e.g. user_123" 
          />
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <div className="cardTitle">Latest flash sale status</div>
            {flashSaleLoading ? (
              <div className="muted">Loading…</div>
            ) : (
              <>
                <div className="saleStatus">{flashSaleStatus}</div>
                <button className="btn primary" onClick={onRefreshStatus}>
                  Refresh
                </button>
                {flashSaleStatusError && <div className="error">{flashSaleStatusError}</div>}
              </>
            )}
        </section>

        <section className="card">
          <div className="cardTitle">Flash sale window</div>
          {flashSaleLoading ? (
            <div className="muted">Loading…</div>
          ) : (
            <>
              <div className="field">
                <label className="label">Start time</label>
                <input
                  type="datetime-local"
                  value={flashStartLocal}
                  onChange={(e) => setFlashStartLocal(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label">End time</label>
                <input
                  type="datetime-local"
                  value={flashEndLocal}
                  onChange={(e) => setFlashEndLocal(e.target.value)}
                />
              </div>
              <div className="hint">
                Leave both fields empty and save to clear the flash sale window.
              </div>
              <button className="btn primary" onClick={onSaveFlashSale} disabled={flashSaleSaving}>
                {flashSaleSaving ? "Saving…" : "Save flash sale"}
              </button>
              {flashSaleError && <div className="error">{flashSaleError}</div>}
              {flashSaleMessage && <div className="success">{flashSaleMessage}</div>}
            </>
          )}
        </section>

        <section className="card">
          <div className="cardTitle">Products</div>
          {loading ? (
            <div className="muted">Loading…</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <div className="list">
              {products.map((p) => (
                <div className="row" key={p.id}>
                  <div className="grow">
                    <div className="rowTitle">{p.name}</div>
                    <div className="muted">
                      {formatMoney(p.priceCents)} · Stock {p.stock}
                    </div>
                  </div>
                  <div className="actions">
                    <button
                      className="btn primary"
                      onClick={() => onBuyNow(p.id)}
                      disabled={p.stock <= 0 || checkingOut}
                    >
                      Buy now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="cardTitle">Purchase status</div>

          {loading ? (
            <div className="muted">Loading…</div>
          ) : (
            <div>
              {lastOrderId !== null ? (
                <div className="success">Order created: #{lastOrderId}</div>
              ) : null}
              {purchaseStatus === "success" && <div className="success">Purchase successful.</div>}
              {purchaseStatus === "out_of_stock" && <div className="error">This item is out of stock.</div>}
              {purchaseStatus === "sale_ended" && <div className="error">The flash sale has ended.</div>}
              {purchaseStatus === "error" && !error && (
                <div className="error">There was a problem completing your purchase.</div>
              )}
              <div className="hint">
                Constraint demo: try checking out twice with the same user ID — the second one will fail because of the
                partial unique index on completed orders.
              </div>
            </div>
            )
          }
        </section>
      </main>
    </div>
  );
}

