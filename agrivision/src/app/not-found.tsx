import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container grid min-h-[70vh] place-items-center pt-24 text-center">
      <div className="space-y-4">
        <p className="eyebrow">404</p>
        <h1 className="text-4xl font-semibold">This field is fallow.</h1>
        <p className="text-muted-foreground">The page you were looking for has not been planted.</p>
        <Button asChild>
          <Link href="/">Back to the farm</Link>
        </Button>
      </div>
    </div>
  );
}
