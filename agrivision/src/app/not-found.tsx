import { Localized } from "@/i18n/localized";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container grid min-h-[70vh] place-items-center pt-24 text-center">
      <div className="space-y-4">
        <p className="eyebrow">404</p>
        <h1 className="text-4xl font-semibold"><Localized id="ui_875fefd0a46af920" fallback="This field is fallow." /></h1>
        <p className="text-muted-foreground"><Localized id="ui_8411b6b36850ed4a" fallback="The page you were looking for has not been planted." /></p>
        <Button asChild>
          <Link href="/"><Localized id="ui_4e1190afd9de52fc" fallback="Back to the farm" /></Link>
        </Button>
      </div>
    </div>
  );
}
