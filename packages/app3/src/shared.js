import { default as App2Shared } from "app2/Shared";
import React from "react";
export default function Shared() {
  return (
    <div>
      I'm from App3... also nesting App2:
      <App2Shared />
    </div>
  );
}
