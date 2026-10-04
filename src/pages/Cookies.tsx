import LegalLayout from '../components/LegalLayout'

export default function Cookies() {
  return (
    <LegalLayout title="Cookie Policy" updated="29 June 2026">
      <section>
        <p>
          ReviewRadar is operated from <strong>Jabalpur, Madhya Pradesh, India</strong>.
          This page explains how we use browser storage — and what we don't use it for.
        </p>
      </section>

      <section>
        <h2>1. We don't use tracking or advertising cookies</h2>
        <p>
          ReviewRadar doesn't set marketing, advertising, or third-party tracking
          cookies. We don't sell your browsing behavior to ad networks, and we don't run
          cross-site tracking pixels.
        </p>
      </section>

      <section>
        <h2>2. What we actually store in your browser</h2>
        <p>
          Instead of traditional cookies, ReviewRadar uses your browser's local storage
          for a small number of strictly functional purposes:
        </p>
        <ul>
          <li><strong>Session token:</strong> managed automatically by Supabase Auth, this keeps you signed in between visits so you don't have to log in every time.</li>
          <li><strong>Demo session:</strong> if you sign in with the demo account, a local flag (<code>rr_demo_session</code>) marks that session as a demo so it never touches real account data.</li>
          <li><strong>Business cache:</strong> a local copy of your connected business locations (<code>rr_all_businesses_*</code>), used so your dashboard loads instantly instead of waiting on a database round-trip every time.</li>
        </ul>
        <p>
          None of this is used for advertising, and none of it is shared with third
          parties. It exists purely to make the product work.
        </p>
      </section>

      <section>
        <h2>3. Clearing this data</h2>
        <p>
          Signing out clears your session and demo-session storage. You can also clear
          all local storage manually through your browser's settings at any time — doing
          so will simply log you out and require a fresh dashboard load on your next
          visit; it won't affect data already saved to your account in our database.
        </p>
      </section>

      <section>
        <h2>4. If this changes</h2>
        <p>
          If we ever introduce analytics or marketing cookies in the future, we'll update
          this page first and add a consent banner before any non-essential cookie is set.
          As of the date above, no such cookies exist on ReviewRadar.
        </p>
      </section>

      <section>
        <h2>5. Contact</h2>
        <p>
          Questions about browser storage or this policy? Email{' '}
          <a href="mailto:hello@reviewradar.com" className="text-black underline">hello@reviewradar.com</a>.
        </p>
      </section>
    </LegalLayout>
  )
}
