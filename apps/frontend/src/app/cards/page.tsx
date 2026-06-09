"use client";

import { ProductAppShell, renderProductRoute } from "../product-render";
import { Route } from "../../product-ui/routes/app.cards";

export default function CardsRedirectPage() {
  return (
    <ProductAppShell>
      {renderProductRoute(Route)}
    </ProductAppShell>
  );
}
