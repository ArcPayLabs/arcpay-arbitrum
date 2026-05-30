"use client";

import { ProductAppShell, renderProductRoute } from "../../product-render";
import { Route } from "../../../product-ui/routes/app.oracle";

export default function AppOraclePage() {
  return (
    <ProductAppShell>
      {renderProductRoute(Route)}
    </ProductAppShell>
  );
}
