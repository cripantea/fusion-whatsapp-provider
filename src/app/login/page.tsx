import { MessageSquareText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { unstable_rethrow } from "next/navigation";
import { AuthError } from "next-auth";

import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  const t = await getTranslations("auth.login");
  const tApp = await getTranslations("app");
  const { error, reason } = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";

    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/dashboard",
      });
    } catch (caughtError) {
      unstable_rethrow(caughtError);
      if (caughtError instanceof AuthError) {
        redirect("/login?error=1");
      }
      throw caughtError;
    }
  }

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
          {reason === "private_engine" && (
            <p className="mb-4 rounded-md border border-amber-500/50 bg-amber-500/5 p-3 text-sm">
              {t("accessRestricted")}
            </p>
          )}
          <form action={loginAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                {t("emailLabel")}
              </label>
              <Input id="email" name="email" type="email" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                {t("passwordLabel")}
              </label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-sm text-destructive">{t("error")}</p>}
            <Button type="submit" className="mt-2">
              {t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
