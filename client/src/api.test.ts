import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import {
  fetchProducts,
  checkout,
  fetchFlashSaleConfig,
  updateFlashSaleConfig,
  fetchFlashSaleStatus,
  formatMoney,
  type Product,
  type FlashSaleConfig,
  type FlashSaleStatus
} from "./api";

type MockFetchResponse<T = unknown> = {
  ok: boolean;
  status: number;
  json: () => Promise<T>;
};

const createResponse = <T>(data: T, ok = true, status = 200): MockFetchResponse<T> => ({
  ok,
  status,
  json: () => Promise.resolve(data)
});

describe("api", () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  describe("fetchProducts", () => {
    it("returns products on success", async () => {
      const products: Product[] = [
        { id: "1", name: "Test", priceCents: 1234, stock: 10 }
      ];

      mockFetch.mockResolvedValueOnce(
        createResponse<{ products: Product[] }>({ products })
      );

      const result = await fetchProducts();

      expect(mockFetch).toHaveBeenCalledWith("/api/products");
      expect(result).toEqual(products);
    });

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(
        createResponse<{ products: Product[] }>({ products: [] }, false, 500)
      );

      await expect(fetchProducts()).rejects.toThrowError(
        "Failed to load products (500)"
      );
    });
  });

  describe("checkout", () => {
    const params = {
      userId: "user-1",
      items: [{ productId: "p1", quantity: 1 as const }]
    };

    it("returns order data on success", async () => {
      const responseBody = {
        totalCents: 1234,
        order: {
          id: 1,
          user_id: "user-1",
          status: "pending",
          created_at: "2025-01-01T00:00:00Z"
        }
      };

      mockFetch.mockResolvedValueOnce(createResponse(responseBody));

      const result = await checkout(params);

      expect(mockFetch).toHaveBeenCalledWith("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(params)
      });
      expect(result).toEqual(responseBody);
    });

    it("throws error message from response body when available", async () => {
      const errorBody = { error: "Invalid items" };

      mockFetch.mockResolvedValueOnce(
        createResponse(errorBody, false, 400)
      );

      await expect(checkout(params)).rejects.toThrowError("Invalid items");
    });

    it("throws generic message when response body is not usable", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("bad json"))
      });

      await expect(checkout(params)).rejects.toThrowError(
        "Request failed (500)"
      );
    });
  });

  describe("fetchFlashSaleConfig", () => {
    it("returns config with normalized nulls", async () => {
      const cfg: FlashSaleConfig = {
        start: undefined as unknown as string,
        end: null
      };

      mockFetch.mockResolvedValueOnce(createResponse(cfg));

      const result = await fetchFlashSaleConfig();

      expect(mockFetch).toHaveBeenCalledWith("/api/flash-sale");
      expect(result).toEqual({ start: null, end: null });
    });

    it("throws when response is not ok", async () => {
      const cfg: FlashSaleConfig = { start: "2025-01-01T00:00:00Z", end: "2025-01-02T00:00:00Z" };

      mockFetch.mockResolvedValueOnce(
        createResponse(cfg, false, 500)
      );

      await expect(fetchFlashSaleConfig()).rejects.toThrowError(
        "Failed to load flash sale config (500)"
      );
    });
  });

  describe("updateFlashSaleConfig", () => {
    const params: FlashSaleConfig = {
      start: "2025-01-01T00:00:00Z",
      end: null
    };

    it("returns updated config with normalized nulls on success", async () => {
      const cfg: FlashSaleConfig = { start: params.start, end: undefined as unknown as string };

      mockFetch.mockResolvedValueOnce(createResponse(cfg));

      const result = await updateFlashSaleConfig(params);

      expect(mockFetch).toHaveBeenCalledWith("/api/flash-sale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(params)
      });
      expect(result).toEqual({ start: params.start, end: null });
    });

    it("throws error message from response body when available", async () => {
      const errorBody = { error: "Invalid dates" };

      mockFetch.mockResolvedValueOnce(
        createResponse(errorBody, false, 400)
      );

      await expect(updateFlashSaleConfig(params)).rejects.toThrowError(
        "Invalid dates"
      );
    });

    it("throws generic message when body is not usable", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("bad json"))
      });

      await expect(updateFlashSaleConfig(params)).rejects.toThrowError(
        "Request failed (500)"
      );
    });
  });

  describe("fetchFlashSaleStatus", () => {
    it("returns status on success", async () => {
      const status: FlashSaleStatus = {
        status: "active",
        now: "2025-01-01T00:00:00Z",
        start: "2025-01-01T00:00:00Z",
        end: "2025-01-02T00:00:00Z"
      };

      mockFetch.mockResolvedValueOnce(createResponse(status));

      const result = await fetchFlashSaleStatus();

      expect(mockFetch).toHaveBeenCalledWith("/api/flash-sale/status");
      expect(result).toEqual(status);
    });

    it("throws when response is not ok", async () => {
      const status: FlashSaleStatus = {
        status: "ended",
        now: "2025-01-03T00:00:00Z",
        start: "2025-01-01T00:00:00Z",
        end: "2025-01-02T00:00:00Z"
      };

      mockFetch.mockResolvedValueOnce(
        createResponse(status, false, 500)
      );

      await expect(fetchFlashSaleStatus()).rejects.toThrowError(
        "Failed to load flash sale status (500)"
      );
    });
  });

  describe("formatMoney", () => {
    it("formats cents as USD currency", () => {
      const cents = 12345;
      const expected = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD"
      }).format(cents / 100);

      expect(formatMoney(cents)).toBe(expected);
    });

    it("handles zero correctly", () => {
      const cents = 0;
      const expected = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD"
      }).format(0);

      expect(formatMoney(cents)).toBe(expected);
    });
  });
});
