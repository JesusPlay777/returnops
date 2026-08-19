import type { Metadata } from "next";

import XmartDemoScreen from "@/features/xmart/components/xmart-demo-screen";

export const metadata: Metadata = {
  title: "Xmart — Customer provisioning demo",
  description:
    "An isolated customer, user, device-assignment, and security-audit workflow.",
};

export default function XmartPage() {
  return <XmartDemoScreen />;
}
