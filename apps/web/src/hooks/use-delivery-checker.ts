"use client";

import { useState } from "react";
import { isMetroTown } from "@/lib/commerce";

export function useDeliveryChecker() {
  const [deliveryTown, setDeliveryTown] = useState("San Juan");
  const metro = isMetroTown(deliveryTown);

  return {
    deliveryTown,
    setDeliveryTown,
    metro,
  };
}
