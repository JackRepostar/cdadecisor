"use server";

import { prisma } from "@/lib/prisma";
import { requestMagicLink } from "@/lib/magic-link";
import { Prisma } from "@prisma/client";

export type SignupState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "created"; devLoginUrl: string | null };

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "azienda"
  );
}

export async function signupAction(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!companyName || !firstName || !lastName || !email) {
    return { status: "error", message: "Compila tutti i campi." };
  }

  const baseSlug = slugify(companyName);
  let slug = baseSlug;
  let attempt = 0;
  // Rarissimo, ma due aziende potrebbero scegliere lo stesso nome.
  while (await prisma.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt + 1}`;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: companyName, slug },
      });
      await tx.member.create({
        data: {
          organizationId: organization.id,
          firstName,
          lastName,
          email,
          role: "ADMIN",
          jobTitle: "Amministratore",
          status: "VERIFIED",
          color: "#1B2A41",
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "Esiste già un account con questa email." };
    }
    throw error;
  }

  const result = await requestMagicLink(email);
  return {
    status: "created",
    devLoginUrl: result.status === "sent" ? result.devLoginUrl : null,
  };
}
