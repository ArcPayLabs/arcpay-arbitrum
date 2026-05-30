"use client";

import { ProductAppShell, renderProductRoute } from "../product-render";
import { Route } from "../../product-ui/routes/app.status";

export default function StatusPage() {
  return <ProductAppShell>{renderProductRoute(Route)}</ProductAppShell>;
}
