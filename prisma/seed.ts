import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Svuoto le tabelle...");
  await prisma.minutesNotification.deleteMany();
  await prisma.minutes.deleteMany();
  await prisma.emailNotification.deleteMany();
  await prisma.staffFeedback.deleteMany();
  await prisma.staffAssignment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.magicLinkToken.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.member.deleteMany();
  await prisma.accessGrant.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.platformMagicLinkToken.deleteMany();
  await prisma.platformAdmin.deleteMany();

  console.log("Creo l'amministratore Quitebold...");
  const platformAdmin = await prisma.platformAdmin.create({
    data: {
      firstName: "Quitebold",
      lastName: "Staff",
      email: "staff@quitebold.studio",
    },
  });

  console.log("Creo l'organizzazione demo...");
  const org = await prisma.organization.create({
    data: {
      name: "Acme Industrie S.p.A.",
      legalForm: "Società per Azioni",
      registeredOffice: "Via Roma 1, 20100 Milano (MI)",
      taxId: "IT01234567890",
      slug: "acme-industrie",
    },
  });

  // La demo ha 6 membri di CdA, oltre il limite gratuito di 2: sblocchiamo
  // l'organizzazione con una concessione a vita così i dati dimostrativi
  // restano pienamente funzionanti senza dover simulare un pagamento.
  await prisma.accessGrant.create({
    data: {
      organizationId: org.id,
      grantedById: platformAdmin.id,
      duration: "LIFETIME",
      note: "Concessione dimostrativa per l'organizzazione seed.",
    },
  });

  console.log("Creo i membri...");
  const admin = await prisma.member.create({
    data: {
      organizationId: org.id,
      firstName: "Roberto",
      lastName: "Sant'Angelo",
      email: "admin@azienda.it",
      role: "ADMIN",
      jobTitle: "Amministratore di sistema",
      status: "VERIFIED",
      color: "#3B3F47",
    },
  });

  const [elena, marco, giulia, davide, sara, luca] = await Promise.all([
    prisma.member.create({
      data: {
        organizationId: org.id,
        firstName: "Elena",
        lastName: "Ferraris",
        email: "elena.ferraris@azienda.it",
        role: "BOARD",
        jobTitle: "Presidente",
        status: "VERIFIED",
        color: "#B8912F",
        isPresident: true,
      },
    }),
    prisma.member.create({
      data: {
        organizationId: org.id,
        firstName: "Marco",
        lastName: "Vitali",
        email: "marco.vitali@azienda.it",
        role: "BOARD",
        jobTitle: "Consigliere",
        status: "VERIFIED",
        color: "#1B2A41",
      },
    }),
    prisma.member.create({
      data: {
        organizationId: org.id,
        firstName: "Giulia",
        lastName: "Romano",
        email: "giulia.romano@azienda.it",
        role: "BOARD",
        jobTitle: "Consigliere",
        status: "VERIFIED",
        color: "#5B7C99",
      },
    }),
    prisma.member.create({
      data: {
        organizationId: org.id,
        firstName: "Davide",
        lastName: "Conti",
        email: "davide.conti@azienda.it",
        role: "BOARD",
        jobTitle: "Consigliere Delegato",
        status: "VERIFIED",
        color: "#7D6B57",
      },
    }),
    prisma.member.create({
      data: {
        organizationId: org.id,
        firstName: "Sara",
        lastName: "Bianchi",
        email: "sara.bianchi@azienda.it",
        role: "BOARD",
        jobTitle: "Consigliere Indipendente",
        status: "VERIFIED",
        color: "#8A5A44",
      },
    }),
    prisma.member.create({
      data: {
        organizationId: org.id,
        firstName: "Luca",
        lastName: "Moretti",
        email: "luca.moretti@azienda.it",
        role: "BOARD",
        jobTitle: "Consigliere",
        status: "PENDING",
        color: "#4E6E58",
      },
    }),
  ]);

  const [paolo, anna] = await Promise.all([
    prisma.member.create({
      data: {
        organizationId: org.id,
        firstName: "Paolo",
        lastName: "Greco",
        email: "paolo.greco@studiolegaleesterno.it",
        role: "STAFF",
        jobTitle: "Consulente legale esterno",
        status: "VERIFIED",
        color: "#8E5E8B",
      },
    }),
    prisma.member.create({
      data: {
        organizationId: org.id,
        firstName: "Anna",
        lastName: "De Luca",
        email: "anna.deluca@azienda.it",
        role: "STAFF",
        jobTitle: "Responsabile amministrativo",
        status: "VERIFIED",
        color: "#3E7C8C",
      },
    }),
  ]);

  console.log("Creo le richieste di esempio...");

  const bologna = await prisma.proposal.create({
    data: {
      organizationId: org.id,
      title: "Apertura nuova sede a Bologna",
      description:
        "Richiesta di approvazione per la sottoscrizione di un contratto di locazione triennale per l'apertura di una sede operativa a Bologna. Canone annuo previsto: € 84.000. L'ufficio ospiterebbe il team tecnico (12 persone) attualmente in coworking.",
      status: "OPEN",
      authorId: davide.id,
      createdById: davide.id,
      createdAt: new Date("2026-09-18"),
    },
  });
  await prisma.vote.createMany({
    data: [
      {
        proposalId: bologna.id,
        memberId: elena.id,
        choice: "YES",
        motivation: "Coerente con il piano di espansione approvato a gennaio.",
      },
      {
        proposalId: bologna.id,
        memberId: marco.id,
        choice: "NO",
        motivation:
          "Preferirei rivalutare tra 6 mesi, dato il canone elevato rispetto al budget immobiliare 2026.",
      },
    ],
  });
  await prisma.staffAssignment.create({
    data: { proposalId: bologna.id, memberId: anna.id },
  });

  await prisma.proposal.create({
    data: {
      organizationId: org.id,
      title: "Aumento massimale carta aziendale reparto vendite",
      description:
        "Proposta di incremento del massimale mensile delle carte aziendali del reparto commerciale da € 1.500 a € 2.500, per coprire l'aumento delle trasferte previste nel Q4 in vista delle fiere di settore.",
      status: "OPEN",
      authorId: marco.id,
      createdById: marco.id,
      createdAt: new Date("2026-09-20"),
    },
  });

  const iso = await prisma.proposal.create({
    data: {
      organizationId: org.id,
      title: "Adesione al programma di certificazione ISO 9001",
      description:
        "Richiesta di stanziamento di € 22.000 per l'avvio del percorso di certificazione ISO 9001, requisito richiesto da due clienti enterprise per il rinnovo dei contratti 2027.",
      status: "CLOSED",
      outcome: "APPROVED",
      authorId: sara.id,
      createdById: sara.id,
      createdAt: new Date("2026-09-15"),
      closedAt: new Date("2026-09-17"),
    },
  });
  await prisma.vote.createMany({
    data: [
      { proposalId: iso.id, memberId: elena.id, choice: "YES", motivation: "Investimento necessario per non perdere i due contratti enterprise." },
      { proposalId: iso.id, memberId: marco.id, choice: "YES", motivation: "D'accordo, il ritorno giustifica ampiamente il costo." },
      { proposalId: iso.id, memberId: giulia.id, choice: "YES", motivation: "Favorevole, chiedo però un aggiornamento trimestrale sull'avanzamento." },
      { proposalId: iso.id, memberId: davide.id, choice: "NO", motivation: "Preferirei valutare prima un fornitore alternativo più economico." },
    ],
  });
  await prisma.staffAssignment.create({
    data: { proposalId: iso.id, memberId: paolo.id },
  });
  await prisma.staffFeedback.create({
    data: {
      proposalId: iso.id,
      memberId: paolo.id,
      preference: "POSITIVE",
      comment:
        "Dal punto di vista legale non ci sono controindicazioni; consiglio di formalizzare i tempi di verifica nel contratto col fornitore.",
    },
  });

  const dividendo = await prisma.proposal.create({
    data: {
      organizationId: org.id,
      title: "Distribuzione dividendo straordinario",
      description:
        "Proposta di distribuzione di un dividendo straordinario di € 150.000 a valere sugli utili dell'esercizio precedente, in considerazione della solidità della posizione di cassa.",
      status: "CLOSED",
      outcome: "REJECTED",
      authorId: elena.id,
      createdById: elena.id,
      createdAt: new Date("2026-09-05"),
      closedAt: new Date("2026-09-08"),
    },
  });
  await prisma.vote.createMany({
    data: [
      { proposalId: dividendo.id, memberId: elena.id, choice: "YES", motivation: "La cassa lo consente senza mettere a rischio gli investimenti pianificati." },
      { proposalId: dividendo.id, memberId: marco.id, choice: "NO", motivation: "Preferirei reinvestire nella crescita organica prima di distribuire utili." },
      { proposalId: dividendo.id, memberId: giulia.id, choice: "NO", motivation: "Contrario in questa fase: meglio consolidare il fondo di riserva." },
      { proposalId: dividendo.id, memberId: davide.id, choice: "NO", motivation: "Non ora: abbiamo due assunzioni chiave da finanziare nel Q1." },
      { proposalId: dividendo.id, memberId: sara.id, choice: "YES", motivation: "Favorevole, è una prassi corretta verso i soci in un anno positivo." },
    ],
  });

  const dueO = await prisma.proposal.create({
    data: {
      organizationId: org.id,
      title: "Rinnovo assicurazione D&O per gli amministratori",
      description:
        "Rinnovo annuale della polizza assicurativa Directors & Officers, con massimale invariato a € 2.000.000 e premio di € 9.400, fornitore confermato.",
      status: "CLOSED",
      outcome: "APPROVED",
      authorId: giulia.id,
      createdById: giulia.id,
      createdAt: new Date("2026-08-28"),
      closedAt: new Date("2026-08-30"),
    },
  });
  await prisma.vote.createMany({
    data: [
      { proposalId: dueO.id, memberId: elena.id, choice: "YES", motivation: "Copertura essenziale, condizioni invariate rispetto al 2025." },
      { proposalId: dueO.id, memberId: marco.id, choice: "YES", motivation: "Nessuna obiezione." },
      { proposalId: dueO.id, memberId: giulia.id, choice: "YES", motivation: "Proposto da me, confermo." },
      { proposalId: dueO.id, memberId: davide.id, choice: "YES", motivation: "Favorevole." },
      { proposalId: dueO.id, memberId: sara.id, choice: "YES", motivation: "Favorevole, premio in linea col mercato." },
    ],
  });

  console.log("Creo una seconda organizzazione per verificare l'isolamento multi-tenant...");
  const orgBeta = await prisma.organization.create({
    data: {
      name: "Beta Consulting Srl",
      legalForm: "Società a Responsabilità Limitata",
      registeredOffice: "Corso Italia 45, 10100 Torino (TO)",
      taxId: "IT09876543210",
      slug: "beta-consulting",
    },
  });
  const betaAdmin = await prisma.member.create({
    data: {
      organizationId: orgBeta.id,
      firstName: "Chiara",
      lastName: "Ferro",
      email: "admin@betaconsulting.it",
      role: "ADMIN",
      jobTitle: "Amministratore di sistema",
      status: "VERIFIED",
      color: "#2F5D50",
    },
  });
  const betaBoard = await prisma.member.create({
    data: {
      organizationId: orgBeta.id,
      firstName: "Tommaso",
      lastName: "Rinaldi",
      email: "tommaso.rinaldi@betaconsulting.it",
      role: "BOARD",
      jobTitle: "Presidente",
      status: "VERIFIED",
      color: "#94622B",
      isPresident: true,
    },
  });
  await prisma.proposal.create({
    data: {
      organizationId: orgBeta.id,
      title: "Rinnovo contratto software gestionale",
      description:
        "Rinnovo annuale della licenza del software gestionale per il team amministrativo, canone € 4.200/anno.",
      status: "OPEN",
      authorId: betaBoard.id,
      createdById: betaAdmin.id,
      createdAt: new Date("2026-09-22"),
    },
  });

  console.log("Fatto.");
  console.log(`Pannello Quitebold: ${platformAdmin.email}`);
  console.log(`--- Organizzazione: ${org.name} (${org.slug}) — sbloccata a vita ---`);
  console.log(`Admin:            ${admin.email}`);
  console.log(`Consiglieri:      elena.ferraris, marco.vitali, giulia.romano, davide.conti, sara.bianchi @azienda.it`);
  console.log(`In attesa:        ${luca.email}`);
  console.log(`Staff:            ${paolo.email}, ${anna.email}`);
  console.log(`--- Organizzazione: ${orgBeta.name} (${orgBeta.slug}) — piano gratuito ---`);
  console.log(`Admin:            ${betaAdmin.email}`);
  console.log(`Consigliere:      ${betaBoard.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
