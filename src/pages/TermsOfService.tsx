import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

const TermsOfService = () => {
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
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl sm:text-2xl font-sans font-bold">Terms of Service</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-sm">Last updated: February 12, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using Market Compass, you agree to be bound by these Terms of Service and our Privacy Policy.</p>

        <h2>2. Description of Service</h2>
        <p>Market Compass is an agent decision-support tool that provides market analysis reports for real estate professionals. It uses public market trend research and transaction logic. It does <strong>not</strong> use MLS data or provide property valuations.</p>

        <h2>3. User Accounts</h2>
        <ul>
          <li>You must provide accurate account information</li>
          <li>You are responsible for maintaining account security</li>
          <li>One account per user</li>
          <li>You must be at least 18 years of age</li>
        </ul>

        <h2>4. Acceptable Use</h2>
        <p>You agree NOT to:</p>
        <ul>
          <li>Violate any applicable laws or regulations</li>
          <li>Share account credentials with others</li>
          <li>Reverse engineer or attempt to extract source code</li>
          <li>Use the service for unauthorized or misleading purposes</li>
          <li>Input intentionally false or misleading data</li>
        </ul>

        <h2>5. Intellectual Property</h2>
        <ul>
          <li>Market Compass owns all rights to the service, design, and methodology</li>
          <li>You retain ownership of data you create within the service</li>
          <li>We grant you a limited, revocable license to use the service</li>
        </ul>

        <h2>6. User Content</h2>
        <ul>
          <li>You own the reports and analysis content you create</li>
          <li>You grant us a license to store and process your content to provide the service</li>
          <li>You are responsible for the accuracy of data you input</li>
        </ul>

        <h2>7. Disclaimer of Warranties</h2>
        <p>Market Compass is provided "as is" without warranty of any kind. Reports are decision-support tools, <strong>not</strong> professional appraisals or legal advice. Use at your own risk.</p>

        <h2>8. Limitation of Liability</h2>
        <ul>
          <li>We are not liable for business losses arising from use of the service</li>
          <li>We are not liable for data loss beyond reasonable backup measures</li>
          <li>Maximum liability is limited to fees paid in the prior 12 months</li>
        </ul>

        <h2>9. Subscription and Billing</h2>
        <ul>
          <li>Subscriptions auto-renew unless cancelled before the renewal date</li>
          <li>Refunds are handled on a case-by-case basis</li>
          <li>We will provide 30 days notice before price changes</li>
        </ul>

        <h2>10. Termination</h2>
        <ul>
          <li>You may delete your account at any time</li>
          <li>We may suspend accounts that violate these terms</li>
          <li>No refunds are issued for early termination</li>
        </ul>

        <h2>11. Changes to Terms</h2>
        <p>We may update these terms. Material changes will be communicated via email or in-app notice. Continued use constitutes acceptance of updated terms.</p>

        <h2>12. Governing Law</h2>
        <p>These terms are governed by the laws of the State of Washington. Disputes shall be resolved in the courts of King County, WA.</p>

        <h2>13. Contact</h2>
        <p>Questions about these terms? Contact us at <a href="mailto:legal@market-compass.com" className="text-primary">legal@market-compass.com</a>.</p>
      </div>
    </div>
  );
};

export default TermsOfService;
