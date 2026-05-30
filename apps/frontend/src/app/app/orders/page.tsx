"use client";

import { ProductAppShell, renderProductRoute } from "../../product-render";
import { Route } from "../../../product-ui/routes/app.orders";

export default function AppOrdersPage() {
  return (
    <ProductAppShell>
      {renderProductRoute(Route)}
    </ProductAppShell>
  );
}
