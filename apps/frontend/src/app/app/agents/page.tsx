"use client";

import { ProductAppShell, renderProductRoute } from "../../product-render";
import { Route } from "../../../product-ui/routes/app.agents";

export default function AppAgentsPage() {
  return (
    <ProductAppShell>
      {renderProductRoute(Route)}
    </ProductAppShell>
  );
}
