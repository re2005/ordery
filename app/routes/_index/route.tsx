import type { MetaFunction } from "@remix-run/node";

import { HeroSection } from "@/components/hero-section";
import { Link } from "@shopify/polaris";

export const meta: MetaFunction = () => [
  { title: "Ordery • Order automation made easy" },
  {
    name: "description",
    content: "Simplify Your Orders, Amplify Your Success",
  },
];

export default function App() {
  return (
    <div className="showcase">
      <HeroSection />
    </div>
  );
}
