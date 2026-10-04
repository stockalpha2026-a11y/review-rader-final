import LegalLayout from '../components/LegalLayout'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="29 June 2026">
      <section>
        <p>
          ReviewRadar is operated from <strong>Jabalpur, Madhya Pradesh, India</strong>.
          This policy explains what data we collect, why, and how it's protected. We've
          written it to actually describe what the product does, not as boilerplate.
        </p>
      </section>

      <section>
        <h2>1. What we collect</h2>
        <ul>
          <li><strong>Account data:</strong> your name, email, country, and business type, collected when you sign up.</li>
          <li><strong>Business data:</strong> the name, address, and platforms of any business location you connect.</li>
          <li><strong>Scraped review content:</strong> publicly available reviews and mentions from the platforms you choose to monitor (currently Google Reviews and Reddit).</li>
          <li><strong>Usage data:</strong> basic interaction data (pages visited, features used) to help us fix bugs and improve the product.</li>
        </ul>
      </section>

      <section>
        <h2>2. What we don't collect</h2>
        <ul>
          <li>We never see or store your raw password. Authentication is handled by Supabase Auth, which stores passwords as salted hashes — not as plain text, and not accessible to us in readable form.</li>
          <li>We don't scrape private messages, private accounts, or any content not publicly visible on the platforms we monitor.</li>
          <li>We don't sell your data to third parties.</li>
        </ul>
      </section>

      <section>
        <h2>3. Where your data lives</h2>
        <p>
          Account and business data is stored in our Supabase database, protected by
          Row Level Security — a database-level rule that ensures your account can only
          ever read or write your own data, enforced independently of our application
          code. A small local cache of your business list is also kept in your browser's
          local storage purely to make the dashboard load instantly; it never contains
          your password and is cleared when you sign out.
        </p>
      </section>

      <section>
        <h2>4. How we use your data</h2>
        <ul>
          <li>To run the core service: scraping, sentiment analysis, and generating your daily/weekly reports.</li>
          <li>To send you account-related notifications (e.g. urgent review alerts), if enabled.</li>
          <li>To improve ReviewRadar's accuracy and reliability over time.</li>
          <li>To respond to support requests you send us.</li>
        </ul>
      </section>

      <section>
        <h2>5. Third-party services</h2>
        <p>
          We use Supabase for authentication and database hosting, and AI providers for
          sentiment analysis and reply-draft generation. These providers process data on
          our behalf under their own security and privacy commitments — we don't share
          your data with anyone for their own independent marketing purposes.
        </p>
      </section>

      <section>
        <h2>6. Your rights</h2>
        <p>
          You can request a copy of your data, ask us to correct inaccuracies, or request
          full account deletion at any time by emailing{' '}
          <a href="mailto:hello@reviewradar.com" className="text-black underline">hello@reviewradar.com</a>.
          We'll act on deletion requests within 30 days, removing your account data and
          any associated business records from our systems.
        </p>
      </section>

      <section>
        <h2>7. Data retention</h2>
        <p>
          We keep your account and business data for as long as your account is active.
          If you delete your account, we remove your personal data and connected business
          records, retaining only what's strictly required for legal or accounting
          purposes (e.g. billing records), for the minimum period the law requires.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          Authentication runs through Supabase Auth with hashed passwords and signed
          session tokens. Database access is restricted by Row Level Security so that
          even a compromised front-end client cannot read another user's data. We also
          validate and sanitize input on sign-up and business-creation forms before it's
          stored or rendered.
        </p>
      </section>

      <section>
        <h2>9. Changes to this policy</h2>
        <p>
          If we make material changes to how we handle your data, we'll update this page
          and the "Last updated" date above. For significant changes, we'll also notify
          active accounts by email.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          For any privacy questions or data requests, email{' '}
          <a href="mailto:hello@reviewradar.com" className="text-black underline">hello@reviewradar.com</a>.
        </p>
      </section>
    </LegalLayout>
  )
}
