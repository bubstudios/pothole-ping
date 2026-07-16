import React from 'react';
import { Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-[100dvh] bg-background safe-top pb-safe">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-base leading-tight">Privacy Policy</h1>
          <p className="text-xs text-muted-foreground">Last updated: July 2026</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <p>
            PotholePing ("we," "us," or "the app") is a community-driven platform that helps users
            report, track, and avoid potholes. This Privacy Policy explains what data we collect, why
            we collect it, and how it is used.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-semibold text-foreground text-base mb-2">Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Location Data:</strong> We collect your device's GPS
              location when you report a pothole, use proximity alerts, or save a commute route. This
              is used to place reports on the map and warn you of nearby hazards.
            </li>
            <li>
              <strong className="text-foreground">Account Information:</strong> When you register, we
              collect your email address. Your display name may appear on reports, comments, and
              community posts you create.
            </li>
            <li>
              <strong className="text-foreground">Photos:</strong> Photos you upload of potholes or
              vehicle damage are stored and displayed publicly on the app alongside your report.
            </li>
            <li>
              <strong className="text-foreground">Voice Input:</strong> The voice reporting feature uses
              your device's speech recognition to transcribe spoken descriptions. Audio is processed by
              your device's built-in speech service and is not recorded or stored by us.
            </li>
            <li>
              <strong className="text-foreground">Push Notifications:</strong> With your permission, we
              use OneSignal to send push notifications about nearby hazards, commute alerts, and
              status updates on your reports.
            </li>
            <li>
              <strong className="text-foreground">User-Generated Content:</strong> Comments, watch zone
              posts, and community interactions are stored and displayed to other users.
            </li>
            <li>
              <strong className="text-foreground">Usage Data:</strong> We may collect anonymized
              analytics about how the app is used to improve features and performance.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-semibold text-foreground text-base mb-2">How We Use Your Data</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To place pothole reports on the community map at the correct location.</li>
            <li>To provide real-time proximity alerts when you approach a reported pothole.</li>
            <li>To automatically identify and contact the responsible government jurisdiction on your behalf.</li>
            <li>To send push notifications about report status changes and nearby hazards.</li>
            <li>To calculate community reputation scores and display community contributions.</li>
            <li>To process donations made through the app (payment card data is handled by Stripe and is not stored by us).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-semibold text-foreground text-base mb-2">Data Sharing</h2>
          <p>
            Pothole reports—including location, photos, and descriptions—may be submitted to government
            agencies and road authorities (such as city, county, or state departments of transportation)
            via email or Open311 service requests. This sharing is the core function of the app and
            helps ensure reports reach the responsible authority.
          </p>
          <p className="mt-2">
            We do not sell your personal data to third parties. Anonymized, aggregated data may be
            shared for research or public information purposes.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-semibold text-foreground text-base mb-2">Data Retention</h2>
          <p>
            Pothole reports and associated content are retained until the pothole is marked as fixed and
            a retention period has passed. Your account data is retained for as long as your account is
            active. You may request deletion of your account and associated data at any time through the
            app settings.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-semibold text-foreground text-base mb-2">Permissions Used</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-foreground">Location:</strong> To drop pins at your position and provide proximity alerts.</li>
            <li><strong className="text-foreground">Microphone:</strong> To enable voice-to-text pothole reporting.</li>
            <li><strong className="text-foreground">Notifications:</strong> To send alerts about nearby hazards and report updates.</li>
            <li><strong className="text-foreground">Camera/Storage:</strong> To attach photos of potholes and vehicle damage.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-semibold text-foreground text-base mb-2">Children's Privacy</h2>
          <p>
            PotholePing is not directed at children under 13. We do not knowingly collect personal
            information from children under 13. If you believe a child has provided us with personal
            information, please contact us so we can remove it.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-semibold text-foreground text-base mb-2">Your Rights</h2>
          <p>
            You may access, correct, or delete your personal data through the app. You can disable
            location, microphone, and notification permissions at any time through your device settings.
            You may delete your account at any time from the Settings page.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-semibold text-foreground text-base mb-2">Third-Party Services</h2>
          <p>
            The app uses the following third-party services, each with their own privacy policies:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Stripe — payment processing for donations</li>
            <li>OneSignal — push notification delivery</li>
            <li>OpenStreetMap — map tiles and geocoding</li>
            <li>Google (via device) — speech recognition for voice reporting</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-semibold text-foreground text-base mb-2">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be posted within the
            app, and the "Last updated" date will be revised accordingly.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-semibold text-foreground text-base mb-2">Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or your data, please use the in-app feedback
            feature or contact us through the app's Settings page.
          </p>
        </section>
      </div>
    </div>
  );
}