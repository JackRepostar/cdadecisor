import { PlatformLoginForm } from "./login-form";

export default function PlatformLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-ink font-display text-lg font-semibold text-paper">
            Q
          </div>
          <h1 className="font-display text-2xl font-semibold">Pannello Quitebold</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Accesso riservato allo staff Quitebold per la gestione delle organizzazioni clienti.
          </p>
        </div>
        <PlatformLoginForm />
      </div>
    </div>
  );
}
