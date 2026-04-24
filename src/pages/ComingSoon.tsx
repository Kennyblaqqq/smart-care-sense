import { AppShell } from "@/components/dashboard/AppShell";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

type Props = { title: string; description: string; eta?: string };

const ComingSoon = ({ title, description, eta = "Coming next iteration" }: Props) => (
  <AppShell>
    <header className="mb-6">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="text-muted-foreground mt-1">{description}</p>
    </header>
    <Card className="glass-card p-10 flex flex-col items-center text-center">
      <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </div>
      <div className="text-sm uppercase tracking-widest text-primary">{eta}</div>
      <p className="mt-2 max-w-md text-muted-foreground">
        We're building this feature in the next iteration. The foundation is ready — your data, auth, and design system are all in place.
      </p>
    </Card>
  </AppShell>
);

export default ComingSoon;