"use client";

import { useState } from "react";
import { isMetroTown } from "@/lib/commerce";

export function useDeliveryChecker() {
  const [deliveryTown, setDeliveryTown] = useState("");
  const trimmed = deliveryTown.trim();
  const metro = trimmed ? isMetroTown(deliveryTown) : null;

  return {
    deliveryTown,
    setDeliveryTown,
    metro,
  };
}
