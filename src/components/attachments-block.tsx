import { humanFileSize } from "@/lib/proposal-helpers";
import type { Attachment } from "@prisma/client";

function fileIcon(mimeType: string, filename: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (filename.toLowerCase().endsWith(".pdf")) return "📄";
  if (/\.xlsx?$/i.test(filename)) return "📊";
  if (/\.docx?$/i.test(filename)) return "📝";
  return "📎";
}

export function AttachmentsBlock({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="my-4">
      <h3 className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-ink-soft">
        Allegati ({attachments.length})
      </h3>
      <div className="divide-y divide-line">
        {attachments.map((a) => (
          <div key={a.id} className="flex items-center gap-2.5 py-2 text-sm first:pt-0">
            {a.mimeType.startsWith("image/") ? (
              <img
                src={`/api/allegati/${a.id}`}
                alt={a.filename}
                className="h-13 w-13 flex-none rounded-lg border border-line object-cover"
              />
            ) : (
              <a
                href={`/api/allegati/${a.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-13 w-13 flex-none items-center justify-center rounded-lg border border-line bg-paper text-xl"
              >
                {fileIcon(a.mimeType, a.filename)}
              </a>
            )}
            <div>
              <a
                href={`/api/allegati/${a.id}`}
                target="_blank"
                rel="noreferrer"
                className="block font-semibold text-ink underline decoration-line underline-offset-2"
              >
                {a.filename}
              </a>
              <span className="text-[11.5px] text-ink-soft">{humanFileSize(a.size)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
