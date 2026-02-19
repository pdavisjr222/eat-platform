import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/auth/login">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <Card>
          <CardHeader className="text-center border-b">
            <CardTitle className="text-3xl font-bold text-green-800 dark:text-green-400">
              Privacy Policy
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Last Updated: December 12, 2025
            </p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none p-8">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground mb-4">
                Project E.A.T. ("we," "our," or "us") is committed to protecting your privacy. This
                Privacy Policy explains how we collect, use, disclose, and safeguard your information
                when you use our platform at projecteat.org. Please read this privacy policy carefully.
                If you do not agree with the terms of this privacy policy, please do not access the site.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>

              <h3 className="text-lg font-medium mb-3">2.1 Personal Information</h3>
              <p className="text-muted-foreground mb-4">
                We may collect personal information that you voluntarily provide when you:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>Register for an account (name, email address, password)</li>
                <li>Complete your profile (location, bio, interests, profile photo)</li>
                <li>Create listings or vendor profiles</li>
                <li>Make purchases or subscribe to premium services</li>
                <li>Contact us or participate in community features</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">2.2 Automatically Collected Information</h3>
              <p className="text-muted-foreground mb-4">
                When you access the platform, we may automatically collect:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>Device information (browser type, operating system)</li>
                <li>IP address and general location</li>
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">2.3 Location Information</h3>
              <p className="text-muted-foreground mb-4">
                With your consent, we may collect precise location data to provide location-based
                services such as the foraging map and local marketplace listings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Create and manage your account</li>
                <li>Provide and maintain our services</li>
                <li>Process transactions and send related information</li>
                <li>Send you emails about your account, updates, and marketing (with consent)</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Monitor and analyze usage and trends to improve the platform</li>
                <li>Detect, prevent, and address fraud and security issues</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-muted-foreground mb-4">
                We may share your information in the following situations:
              </p>

              <h3 className="text-lg font-medium mb-3">4.1 With Other Users</h3>
              <p className="text-muted-foreground mb-4">
                Your public profile information, listings, and community posts are visible to other
                users of the platform as part of its normal operation.
              </p>

              <h3 className="text-lg font-medium mb-3">4.2 With Service Providers</h3>
              <p className="text-muted-foreground mb-4">
                We may share information with third-party vendors who perform services on our behalf:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>Payment processors (Stripe) for handling transactions</li>
                <li>Email service providers (Resend) for sending communications</li>
                <li>Map services (Google Maps) for location features</li>
                <li>Hosting and infrastructure providers</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">4.3 Legal Requirements</h3>
              <p className="text-muted-foreground mb-4">
                We may disclose your information if required by law or if we believe such action is
                necessary to comply with legal obligations, protect our rights, or ensure the safety
                of our users.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Data Retention</h2>
              <p className="text-muted-foreground mb-4">
                We retain your personal information for as long as your account is active or as needed
                to provide you services. We will retain and use your information as necessary to comply
                with our legal obligations, resolve disputes, and enforce our agreements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Data Security</h2>
              <p className="text-muted-foreground mb-4">
                We implement appropriate technical and organizational security measures to protect your
                personal information, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Encryption of data in transit (HTTPS/TLS)</li>
                <li>Secure password hashing</li>
                <li>Regular security audits and monitoring</li>
                <li>Access controls and authentication</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                However, no method of transmission over the Internet is 100% secure, and we cannot
                guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Your Privacy Rights</h2>
              <p className="text-muted-foreground mb-4">
                Depending on your location, you may have certain rights regarding your personal
                information:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
                <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
                <li><strong>Withdraw consent:</strong> Withdraw previously given consent</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                To exercise these rights, please contact us using the information provided below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Cookies and Tracking Technologies</h2>
              <p className="text-muted-foreground mb-4">
                We use cookies and similar tracking technologies to collect and store information.
                Cookies are small data files stored on your device. We use:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Essential cookies:</strong> Required for the platform to function</li>
                <li><strong>Functional cookies:</strong> Remember your preferences and settings</li>
                <li><strong>Analytics cookies:</strong> Help us understand how you use the platform</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                You can control cookies through your browser settings. However, disabling cookies may
                affect platform functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Children's Privacy</h2>
              <p className="text-muted-foreground mb-4">
                The platform is not intended for individuals under 18 years of age. We do not knowingly
                collect personal information from children under 18. If we learn that we have collected
                personal information from a child under 18, we will take steps to delete that information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. International Data Transfers</h2>
              <p className="text-muted-foreground mb-4">
                Your information may be transferred to and processed in countries other than your
                country of residence. These countries may have different data protection laws. By
                using the platform, you consent to the transfer of information to countries outside
                your country of residence.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Third-Party Links</h2>
              <p className="text-muted-foreground mb-4">
                The platform may contain links to third-party websites. We are not responsible for
                the privacy practices of these external sites. We encourage you to read the privacy
                policies of any third-party sites you visit.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any
                changes by posting the new Privacy Policy on this page and updating the "Last Updated"
                date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">13. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have any questions about this Privacy Policy or our data practices, please
                contact us at:
              </p>
              <ul className="list-none text-muted-foreground space-y-1">
                <li><strong>Website:</strong> projecteat.org</li>
                <li><strong>Email:</strong> privacy@projecteat.org</li>
              </ul>
            </section>

            <section className="mt-12 pt-8 border-t">
              <p className="text-sm text-muted-foreground text-center">
                By using Project E.A.T., you acknowledge that you have read and understood this
                Privacy Policy.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
