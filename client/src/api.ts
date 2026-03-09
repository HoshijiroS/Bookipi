export type Product = {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
};

export type FlashSaleConfig = {
  start: string | null;
  end: string | null;
};

export type FlashSaleStatus = {
  status: "upcoming" | "active" | "ended";
  now: string;
  start: string | null;
  end: string | null;
};

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products");
  if (!res.ok) {
    throw new Error(`Failed to load products (${res.status})`);
  }
  const data = (await res.json()) as { products: Product[] };
  return data.products;
}

export async function checkout(params: {
  userId: string;
  items: Array<{ productId: string; quantity: 1 }>;
}): Promise<{ totalCents: number; order: { id: number; user_id: string; status: string; created_at: string } }> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function fetchFlashSaleConfig(): Promise<FlashSaleConfig> {
  const res = await fetch("/api/flash-sale");

  if (!res.ok) {
    throw new Error(`Failed to load flash sale config (${res.status})`);
  }

  const data = (await res.json()) as FlashSaleConfig;
  
  return {
    start: data.start ?? null,
    end: data.end ?? null
  };
}

export async function updateFlashSaleConfig(params: {
  start: string | null;
  end: string | null;
}): Promise<FlashSaleConfig> {
  const res = await fetch("/api/flash-sale", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof (data as any)?.error === "string" ? (data as any).error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  const cfg = data as FlashSaleConfig;
  return {
    start: cfg.start ?? null,
    end: cfg.end ?? null
  };
}

export async function fetchFlashSaleStatus(): Promise<FlashSaleStatus> {
  const res = await fetch("/api/flash-sale/status");
  const data = (await res.json()) as FlashSaleStatus;

  if (!res.ok) {
    throw new Error(`Failed to load flash sale status (${res.status})`);
  }

  return data;
}

export async function restock(params: {
  productId: string 
}): Promise<any> {
  const res = await fetch("/api/products/restock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params)
  });

  const data = (await res.json()).result.items as Product[];

  if (!res.ok) {
    throw new Error('Failed to restock product');
  }
  return data;
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

