"use client";

import { ProductAppShell, renderProductRoute } from "../product-render";
import { Route } from "../../product-ui/routes/app.beta-admin";

export default function BetaAdminPage() {
  return <ProductAppShell>{renderProductRoute(Route)}</ProductAppShell>;
}
