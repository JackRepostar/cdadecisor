import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-navy-soft font-display text-lg font-semibold text-gold-soft">
          CdA
        </div>
        <h1 className="font-display text-2xl font-semibold">Registra la tua azienda</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Crea l&apos;account Amministratore per il tuo Consiglio di Amministrazione.
        </p>
      </div>
      <SignupForm />
      <p className="text-center text-[12.5px] text-ink-soft">
        Hai già un account?{" "}
        <Link href="/login" className="font-semibold text-navy-soft underline">
          Accedi
        </Link>
      </p>
    </div>
  );
}
