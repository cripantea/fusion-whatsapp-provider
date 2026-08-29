import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isPlanType } from "@/lib/plans";
import { isSuperAdminEmail } from "@/lib/superadmin";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  // Modalità Private Engine (B2B): la registrazione pubblica è congelata, non
  // rimossa — riattivarla per il self-service B2C significa solo togliere questo
  // guard, il resto del flusso (form, API, auto-login) resta intatto.
  const session = await auth();
  if (!session) {
    redirect("/login?reason=private_engine");
  }
  if (!isSuperAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }

  const t = await getTranslations("auth.register");
  const tApp = await getTranslations("app");
  const { plan } = await searchParams;
  const selectedPlan = plan && isPlanType(plan) ? plan : null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <MessageSquareText className="size-5 text-primary" />
            <span>{tApp("name")}</span>
          </div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm plan={selectedPlan} />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {t("loginPrompt")}{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              {t("loginLink")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
