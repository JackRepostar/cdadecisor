import { requirePlatformAdmin } from "@/lib/platform-auth";

export default async function QuiteboldConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();

  return (
    <div className="flex-1 pb-24">
      <div className="mx-auto w-full max-w-3xl px-4 pt-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-lg bg-ink font-display text-[15px] font-semibold text-paper">
              Q
            </span>
            <div>
              <div className="font-display text-lg font-semibold">Pannello Quitebold</div>
              <div className="text-[11px] uppercase tracking-wide text-ink-soft">
                {admin.firstName} {admin.lastName}
              </div>
            </div>
          </div>
          <form action="/quitebold/logout" method="post">
            <button
              type="submit"
              className="rounded-full border border-line bg-paper-raised px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:text-ink"
            >
              Esci
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl px-4">{children}</div>
    </div>
  );
}
