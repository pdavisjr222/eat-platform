import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Leaf, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Leaf className="h-10 w-10 text-primary" />
          </div>
        </div>

        <h1 className="text-4xl font-serif font-bold mb-3">Coming Soon</h1>
        <p className="text-lg text-muted-foreground mb-2">
          We're still growing this page.
        </p>
        <p className="text-base text-muted-foreground mb-8">
          The E.A.T. platform is actively being built. Check back soon — something good is on the way.
        </p>

        <Button onClick={() => setLocation("/")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
