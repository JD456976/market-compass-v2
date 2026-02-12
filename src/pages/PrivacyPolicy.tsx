import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold">Privacy Policy</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-sm">Last updated: February 12, 2026</p>

        <h2>1. Information We Collect</h2>
        <ul>
          <li><strong>Account information</strong> — name, email address</li>
          <li><strong>Professional information</strong> — brokerage affiliation (optional)</li>
          <li><strong>Property data you input</strong> — locations, prices, conditions, and analysis parameters</li>
          <li><strong>Usage analytics</strong> — page views, feature usage, session duration</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>Provide and improve the Market Compass service</li>
          <li>Generate property analysis reports</li>
          <li>Customer support</li>
          <li>Security and fraud prevention</li>
        </ul>

        <h2>3. Data Sharing</h2>
        <ul>
          <li>We do <strong>not</strong> sell your personal data</li>
          <li>Reports are only shared when you explicitly choose to share them</li>
          <li>We use service providers for hosting and infrastructure</li>
        </ul>

        <h2>4. Your Rights</h2>
        <ul>
          <li><strong>Access</strong> — request a copy of your data</li>
          <li><strong>Correct</strong> — update inaccurate information</li>
          <li><strong>Delete</strong> — permanently delete your account and data</li>
          <li><strong>Export</strong> — download your data in a portable format</li>
          <li><strong>Opt out</strong> — unsubscribe from marketing communications</li>
        </ul>

        <h2>5. Data Security</h2>
        <ul>
          <li>Encryption in transit (TLS/SSL)</li>
          <li>Encryption at rest for stored data</li>
          <li>Regular security reviews</li>
          <li>Access controls and authentication</li>
        </ul>

        <h2>6. Data Retention</h2>
        <ul>
          <li><strong>Active accounts</strong> — data retained while account is active</li>
          <li><strong>Deleted accounts</strong> — data removed within 30 days</li>
          <li><strong>Shared reports</strong> — remain accessible for 30 days after account deletion</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>We use essential cookies for authentication and preferences. No third-party tracking cookies are used.</p>

        <h2>8. Children's Privacy</h2>
        <p>Market Compass is not intended for users under 18. We do not knowingly collect data from minors.</p>

        <h2>9. Changes to This Policy</h2>
        <p>We may update this policy periodically. Material changes will be communicated via email or in-app notification.</p>

        <h2>10. Contact</h2>
        <p>For privacy questions or data requests, contact us at <a href="mailto:support@market-compass.com" className="text-primary">support@market-compass.com</a>.</p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
