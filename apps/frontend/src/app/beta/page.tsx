"use client";

import { renderProductRoute } from "../product-render";
import { Route } from "../../product-ui/routes/beta";

export default function BetaPage() {
  return renderProductRoute(Route);
}
