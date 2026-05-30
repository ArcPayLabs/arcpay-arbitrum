"use client";

import { ProductAppShell, renderProductRoute } from "../../product-render";
import { Route } from "../../../product-ui/routes/app.x402";

export default function AppX402Page() {
  return <ProductAppShell>{renderProductRoute(Route)}</ProductAppShell>;
}
