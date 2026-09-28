import Link from "next/link";
import { LoginForm } from "./login-form";

const ERROR_MESSAGES: Record<string, string> = {
  link_scaduto: "Il link è scaduto (dura 15 minuti): richiedine uno nuovo.",
  link_usato: "Questo link è già stato usato: richiedine uno nuovo.",
  link_non_valido: "Link non valido: richiedine uno nuovo.",
  link_mancante: "Link incompleto: richiedine uno nuovo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const errore = typeof params.errore === "string" ? ERROR_MESSAGES[params.errore] : null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-navy-soft font-display text-lg font-semibold text-gold-soft">
          CdA
        </div>
        <h1 className="font-display text-2xl font-semibold">CdaDecisor</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Accedi con la tua email aziendale: ti mandiamo un link, niente password.
        </p>
      </div>
      {errore && (
        <div className="rounded-lg bg-bad-bg px-3 py-2 text-center text-[13px] text-bad">
          {errore}
        </div>
      )}
      <LoginForm />
      <p className="text-center text-[12.5px] text-ink-soft">
        La tua azienda non è ancora su CdaDecisor?{" "}
        <Link href="/registrati" className="font-semibold text-navy-soft underline">
          Registrala
        </Link>
      </p>
    </div>
  );
}
