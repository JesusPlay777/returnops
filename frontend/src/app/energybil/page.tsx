import type { Metadata } from "next";

import EnergybilDemoScreen from "@/features/energybil/components/energybil-demo-screen";


export const metadata: Metadata = {
  title: "Energybil — Meter-to-invoice demo",
  description:
    "An isolated synchronous energy billing workflow from gateway reading to simulated notification.",
};

export default function EnergybilPage() {
  return <EnergybilDemoScreen />;
}
