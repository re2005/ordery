import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Privacy Policy • Ordery" },
  {
    name: "description",
    content:
      "Privacy Policy for Ordery – the Shopify app that detects mergeable orders to help reduce shipping and operational costs.",
  },
];

export default function PrivacyPolicy() {
  const lastUpdated = "September 15, 2025"; // today's date

  return (
    <main className="page showcase">
      <section className="container">
        <header className="header">
          <h1>Privacy Policy</h1>
          <p className="date">Last updated: {lastUpdated}</p>
        </header>

        <div className="card">
          <p>
            Ordery ("the App", "we", "our", or "us") provides a service that
            helps Shopify merchants detect and merge potential duplicate or
            closely timed orders ("the Service"). This Privacy Policy describes
            how personal information is collected, used, and shared when you
            install or use the App in connection with your Shopify store.
          </p>

          <Section title="Information We Collect">
            <ul>
              <li>
                <strong>Order information</strong>: We access customer email,
                shipping address, and order details to detect potential
                mergeable orders.
              </li>
              <li>
                <strong>Store information</strong>: Basic store details such as
                shop domain and store settings necessary to operate the App.
              </li>
            </ul>
            <p>
              We do <strong>not</strong> collect payment card details,
              passwords, or any other sensitive personal data beyond what is
              required for order analysis.
            </p>
          </Section>

          <Section title="How We Use Your Information">
            <ul>
              <li>
                Detect orders that may be merged (same customer, address, time
                window).
              </li>
              <li>
                Provide insights to merchants about potential shipping
                optimizations.
              </li>
              <li>Operate, maintain, improve, and support the App.</li>
            </ul>
            <p>
              We <strong>do not sell, rent, or share customer data</strong> with
              third parties for marketing purposes.
            </p>
          </Section>

          <Section title="Data Retention">
            <ul>
              <li>
                We store order data only as long as necessary to provide the
                Service.
              </li>
              <li>
                No personally identifiable customer information is stored
                permanently in our systems beyond what is required for analysis.
              </li>
              <li>
                Merchants may request data deletion at any time (see Contact
                Us).
              </li>
            </ul>
          </Section>

          <Section title="Sharing Your Information">
            <ul>
              <li>
                <strong>Shopify</strong>: We rely on Shopify APIs and webhooks,
                and information is shared as needed to operate the App in
                compliance with Shopify policies.
              </li>
              <li>
                <strong>Service Providers</strong>: We may use third-party
                hosting or analytics services (e.g., Vercel) that process data
                on our behalf under confidentiality obligations.
              </li>
              <li>
                <strong>Legal Requirements</strong>: We may disclose information
                to comply with applicable laws or lawful requests.
              </li>
            </ul>
          </Section>

          <Section title="International Transfers">
            <p>
              Your information may be transferred outside of your jurisdiction,
              including to the United States and Canada, where we host our
              infrastructure and/or our service providers operate. Where
              required, we implement appropriate safeguards for such transfers.
            </p>
          </Section>

          <Section title="Your Rights">
            <p>
              If you are a resident of the European Economic Area (EEA), the
              United Kingdom (UK), or similar jurisdictions, you have the right
              to access, correct, update, or delete your personal information.
              To exercise these rights, please contact us using the information
              below. If you are a merchant, you can also remove the App from
              your Shopify store at any time, after which we will cease further
              data collection.
            </p>
          </Section>

          <Section title="Security">
            <p>
              We take reasonable and appropriate measures designed to protect
              the information provided via the App from loss, misuse,
              unauthorized access, disclosure, alteration, or destruction.
              However, no method of transmission over the Internet or method of
              electronic storage is 100% secure.
            </p>
            <p>
              Before we persist any customer-identifiable order attributes we
              first transform (hash) them using a per-shop salt so that raw
              email addresses and shipping addresses are not stored in
              plaintext. Additionally, our database infrastructure is encrypted
              at rest and in transit, and access is restricted to
              least-privilege service credentials. This combination of hashing
              and industry standard encryption helps mitigate the risk of
              exposure in the unlikely event of a data breach.
            </p>
          </Section>

          <Section title="Data Deletion & Merchant Controls">
            <p>
              You can request deletion of data related to your store by
              contacting us. Upon verification, we will delete relevant data
              within a reasonable time, unless we are required to retain it for
              legal, accounting, or reporting obligations.
            </p>
          </Section>

          <Section title="Changes to this Policy">
            <p>
              We may update this Privacy Policy from time to time. Any changes
              will be posted on this page with an updated "Last updated" date.
              Material changes may be communicated via the merchant email
              associated with your store.
            </p>
          </Section>
        </div>
      </section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
