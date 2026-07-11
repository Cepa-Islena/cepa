import { describe, expect, it } from "vitest";
import { parseContactStatusUpdate, parseOrderStatusUpdate, parseProductStatusUpdate } from "@/lib/admin-mutations";

const id = "00000000-0000-4000-8000-000000000000";

describe("admin mutation parsers", () => {
  it("parses order status updates", () => {
    const formData = new FormData();
    formData.set("orderId", id);
    formData.set("status", "fulfilled");

    expect(parseOrderStatusUpdate(formData)).toEqual({
      orderId: id,
      status: "fulfilled",
    });
  });

  it("rejects invalid and non-admin-editable order statuses", () => {
    const formData = new FormData();
    formData.set("orderId", id);
    formData.set("status", "refunded");
    expect(() => parseOrderStatusUpdate(formData)).toThrow();

    formData.set("status", "paid");
    expect(() => parseOrderStatusUpdate(formData)).toThrow();
  });

  it("parses contact status updates", () => {
    const formData = new FormData();
    formData.set("messageId", id);
    formData.set("status", "archived");

    expect(parseContactStatusUpdate(formData)).toEqual({
      messageId: id,
      status: "archived",
    });
  });

  it("parses product active state updates", () => {
    const formData = new FormData();
    formData.set("productSlug", " parcha-verde ");
    formData.set("active", "false");

    expect(parseProductStatusUpdate(formData)).toEqual({
      productSlug: "parcha-verde",
      active: false,
    });
  });
});
