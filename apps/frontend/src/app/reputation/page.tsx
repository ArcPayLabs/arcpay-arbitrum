"use client";

import { ProductAppShell, renderProductRoute } from "../product-render";
import { Route } from "../../product-ui/routes/app.reputation";

export default function ReputationPage() {
  return <ProductAppShell>{renderProductRoute(Route)}</ProductAppShell>;
}
