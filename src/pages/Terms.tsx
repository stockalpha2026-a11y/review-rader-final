import LegalLayout from '../components/LegalLayout'

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="29 June 2026">
      <section>
        <p>
          These Terms of Service ("Terms") govern your access to and use of ReviewRadar,
          a review monitoring and analytics service operated from <strong>Jabalpur, Madhya
          Pradesh, India</strong>. By creating an account or using ReviewRadar, you agree
          to these Terms. If you don't agree, please don't use the service.
        </p>
      </section>

      <section>
        <h2>1. What ReviewRadar does</h2>
        <p>
          ReviewRadar monitors publicly available reviews and mentions of your business
          across supported platforms (currently Google Reviews and Reddit), runs AI-based
          sentiment analysis on that content, and delivers summarized reports. ReviewRadar
          does not post, edit, or remove reviews on your behalf — reply drafts are
          suggestions for you to review and send yourself.
        </p>
      </section>

      <section>
        <h2>2. Your account</h2>
        <ul>
          <li>You're responsible for keeping your password confidential and for all activity under your account.</li>
          <li>You must provide accurate information when you sign up, including your business details.</li>
          <li>You may only connect businesses you own, manage, or are otherwise authorized to monitor on behalf of.</li>
          <li>Tell us immediately if you suspect unauthorized access to your account.</li>
        </ul>
      </section>

      <section>
        <h2>3. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use ReviewRadar to monitor businesses you have no legitimate connection to.</li>
          <li>Attempt to circumvent rate limits, scraping restrictions, or security controls.</li>
          <li>Use AI-generated reply drafts to post misleading, defamatory, or fabricated responses.</li>
          <li>Reverse-engineer, resell, or white-label the service outside of an authorized Enterprise agreement.</li>
          <li>Use the service in any way that violates applicable Indian law, including the Information Technology Act, 2000.</li>
        </ul>
      </section>

      <section>
        <h2>4. Subscriptions and billing</h2>
        <p>
          Paid plans renew automatically on the billing cycle you select (monthly or
          annual) until cancelled. You can cancel anytime from your account settings;
          cancellation takes effect at the end of the current billing period. Free
          trials convert to a paid plan only if you actively choose one — we don't
          auto-charge a card you haven't added.
        </p>
      </section>

      <section>
        <h2>5. Data accuracy and limitations</h2>
        <p>
          Review scraping and AI sentiment analysis are provided on a best-effort basis.
          Platforms occasionally change their structure in ways that delay or interrupt
          scraping, and sentiment scoring is a model output, not a certified or audited
          metric. ReviewRadar should inform your decisions, not replace your own judgment
          about your business and customers.
        </p>
      </section>

      <section>
        <h2>6. Limitation of liability</h2>
        <p>
          ReviewRadar is provided "as is." To the maximum extent permitted by law, we
          aren't liable for indirect, incidental, or consequential damages arising from
          your use of the service, including reputational or revenue impact from missed
          or delayed alerts. Our total liability for any claim is limited to the amount
          you paid us in the three months before the claim arose.
        </p>
      </section>

      <section>
        <h2>7. Termination</h2>
        <p>
          You can stop using ReviewRadar and delete your account at any time. We may
          suspend or terminate accounts that violate these Terms, including misuse of
          scraped data or attempts to compromise the service's security.
        </p>
      </section>

      <section>
        <h2>8. Changes to these Terms</h2>
        <p>
          We may update these Terms as the service evolves. We'll post the updated
          version here with a new "Last updated" date. Continued use after a change
          means you accept the revised Terms.
        </p>
      </section>

      <section>
        <h2>9. Governing law</h2>
        <p>
          These Terms are governed by the laws of India. Any disputes will be subject
          to the jurisdiction of the courts in Jabalpur, Madhya Pradesh.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          Questions about these Terms? Reach us at{' '}
          <a href="mailto:hello@reviewradar.com" className="text-black underline">hello@reviewradar.com</a>.
        </p>
      </section>
    </LegalLayout>
  )
}
