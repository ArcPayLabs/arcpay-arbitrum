"use client";

import { ProductAppShell, renderProductRoute } from "../../product-render";
import { Route } from "../../../product-ui/routes/app.analytics";

export default function AppAnalyticsPage() {
  return <ProductAppShell>{renderProductRoute(Route)}</ProductAppShell>;
}
