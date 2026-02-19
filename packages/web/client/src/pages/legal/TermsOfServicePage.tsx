import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfServicePage() {
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
              Terms of Service
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Last Updated: December 12, 2025
            </p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none p-8">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground mb-4">
                Welcome to Project E.A.T. (Ecology, Agriculture & Trade). By accessing or using our platform
                at projecteat.org, you agree to be bound by these Terms of Service and all applicable laws
                and regulations. If you do not agree with any of these terms, you are prohibited from using
                or accessing this site.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground mb-4">
                Project E.A.T. is a community platform connecting individuals interested in sustainable
                agriculture, ecology, foraging, and trade across North America, the Caribbean, and South
                America. Our services include:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Marketplace for agricultural products and services</li>
                <li>Foraging map and community spots</li>
                <li>Vendor directory and verification</li>
                <li>Community events and workshops</li>
                <li>Educational training modules</li>
                <li>Job board for agricultural positions</li>
                <li>Member networking and messaging</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
              <p className="text-muted-foreground mb-4">
                To access certain features of the platform, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and accept all risks of unauthorized access</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Be at least 18 years of age to create an account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. User Conduct</h2>
              <p className="text-muted-foreground mb-4">
                You agree not to use the platform to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Violate any local, state, national, or international law</li>
                <li>Post false, misleading, or fraudulent content</li>
                <li>Harass, abuse, or harm another person</li>
                <li>Impersonate any person or entity</li>
                <li>Sell illegal, prohibited, or regulated substances</li>
                <li>Spam or send unsolicited communications</li>
                <li>Interfere with or disrupt the platform's operation</li>
                <li>Attempt to gain unauthorized access to any systems</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Content and Intellectual Property</h2>
              <p className="text-muted-foreground mb-4">
                <strong>Your Content:</strong> You retain ownership of content you post on the platform.
                By posting content, you grant Project E.A.T. a non-exclusive, worldwide, royalty-free
                license to use, display, and distribute your content in connection with the platform.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Platform Content:</strong> All content provided by Project E.A.T., including
                but not limited to text, graphics, logos, and software, is protected by copyright and
                other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Marketplace Transactions</h2>
              <p className="text-muted-foreground mb-4">
                Project E.A.T. provides a platform for users to list and discover products and services.
                We are not a party to transactions between users. You acknowledge that:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>All transactions are between buyers and sellers directly</li>
                <li>Project E.A.T. does not guarantee the quality, safety, or legality of items listed</li>
                <li>Users are responsible for complying with all applicable laws regarding their transactions</li>
                <li>Disputes between users must be resolved directly between the parties</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Premium Membership</h2>
              <p className="text-muted-foreground mb-4">
                We offer premium membership subscriptions with additional features. By subscribing:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>You authorize us to charge your payment method on a recurring basis</li>
                <li>Subscriptions automatically renew unless cancelled before the renewal date</li>
                <li>Refunds are handled according to our refund policy</li>
                <li>We reserve the right to modify pricing with 30 days notice</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Foraging and Safety Disclaimer</h2>
              <p className="text-muted-foreground mb-4 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <strong>Important:</strong> Information about foraging spots and edible plants is provided
                for educational purposes only. Always verify plant identification with qualified experts
                before consuming any foraged items. Project E.A.T. is not responsible for any illness,
                injury, or death resulting from the use of foraging information on this platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-4">
                To the maximum extent permitted by law, Project E.A.T. shall not be liable for any
                indirect, incidental, special, consequential, or punitive damages, or any loss of
                profits or revenues, whether incurred directly or indirectly, or any loss of data,
                use, goodwill, or other intangible losses.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Termination</h2>
              <p className="text-muted-foreground mb-4">
                We may terminate or suspend your account and access to the platform immediately,
                without prior notice or liability, for any reason, including without limitation if
                you breach these Terms of Service. Upon termination, your right to use the platform
                will immediately cease.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Changes to Terms</h2>
              <p className="text-muted-foreground mb-4">
                We reserve the right to modify or replace these Terms at any time. If a revision is
                material, we will provide at least 30 days' notice prior to any new terms taking
                effect. What constitutes a material change will be determined at our sole discretion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Contact Information</h2>
              <p className="text-muted-foreground mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <ul className="list-none text-muted-foreground space-y-1">
                <li><strong>Website:</strong> projecteat.org</li>
                <li><strong>Email:</strong> legal@projecteat.org</li>
              </ul>
            </section>

            <section className="mt-12 pt-8 border-t">
              <p className="text-sm text-muted-foreground text-center">
                By using Project E.A.T., you acknowledge that you have read, understood, and agree
                to be bound by these Terms of Service.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
