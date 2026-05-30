"use client";

import { ProductAppShell, renderProductRoute } from "../product-render";
import { Route } from "../../product-ui/routes/app.developer-access";

export default function DeveloperAccessPage() {
  return <ProductAppShell>{renderProductRoute(Route)}</ProductAppShell>;
}
