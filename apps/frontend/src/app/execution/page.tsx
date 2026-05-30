"use client";

import { ProductAppShell, renderProductRoute } from "../product-render";
import { Route } from "../../product-ui/routes/app.execution";

export default function ExecutionPage() {
  return <ProductAppShell>{renderProductRoute(Route)}</ProductAppShell>;
}
