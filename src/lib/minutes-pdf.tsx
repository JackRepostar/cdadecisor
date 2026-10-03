import "server-only";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Minutes, Organization } from "@prisma/client";
import type { MinutesSnapshot } from "@/lib/minutes";
import { humanFileSize } from "@/lib/proposal-helpers";
import { APP_TIMEZONE } from "@/lib/app-timezone";

function formatDateLong(date: Date) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: APP_TIMEZONE, day: "numeric", month: "long", year: "numeric" }).format(date);
}
function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: APP_TIMEZONE, dateStyle: "long", timeStyle: "short" }).format(date);
}

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Times-Roman", fontSize: 10.5, color: "#1C1F26", lineHeight: 1.4 },
  headerBlock: { marginBottom: 18, borderBottom: "1pt solid #1C1F26", paddingBottom: 12 },
  companyName: { fontSize: 14, fontFamily: "Times-Bold" },
  companyMeta: { fontSize: 9, color: "#4A5164", marginTop: 2 },
  title: { fontSize: 15, fontFamily: "Times-Bold", textAlign: "center", marginTop: 22, marginBottom: 4, letterSpacing: 0.5 },
  subtitle: { fontSize: 10, textAlign: "center", color: "#4A5164", marginBottom: 2 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 10.5, fontFamily: "Times-Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  boardRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5, borderBottom: "0.5pt solid #DEDACA" },
  boardName: { fontFamily: "Times-Bold" },
  boardRole: { color: "#4A5164" },
  delibera: { marginTop: 14, paddingTop: 10, borderTop: "0.5pt solid #DEDACA" },
  deliberaTitle: { fontSize: 11.5, fontFamily: "Times-Bold" },
  deliberaMeta: { fontSize: 9, color: "#4A5164", marginTop: 2, marginBottom: 6 },
  outcomeApproved: { color: "#2F7D5A", fontFamily: "Times-Bold" },
  outcomeRejected: { color: "#B0392B", fontFamily: "Times-Bold" },
  voteRow: { flexDirection: "row", marginBottom: 3 },
  voteMark: { width: 14, fontFamily: "Times-Bold" },
  voteName: { fontFamily: "Times-Bold" },
  voteMotivation: { color: "#4A5164" },
  feedbackBlockTitle: { fontSize: 8.5, textTransform: "uppercase", color: "#4A5164", marginTop: 6, marginBottom: 3, letterSpacing: 0.5 },
  attachmentsLine: { fontSize: 9, color: "#4A5164", marginTop: 4 },
  emptyNotice: { marginTop: 8, fontStyle: "italic", color: "#4A5164" },
  closing: { marginTop: 22, paddingTop: 12, borderTop: "1pt solid #1C1F26" },
  signatureBlock: { marginTop: 26, flexDirection: "row", justifyContent: "flex-end" },
  signatureBox: { width: 240, textAlign: "center" },
  signatureLine: { borderTop: "0.75pt solid #1C1F26", marginTop: 26, paddingTop: 4, fontSize: 9 },
  signedNotice: { fontSize: 9.5, marginTop: 4 },
  footerNote: { position: "absolute", bottom: 28, left: 48, right: 48, fontSize: 7.5, color: "#8b8471", textAlign: "center" },
  pageNumber: { position: "absolute", bottom: 28, right: 48, fontSize: 8, color: "#8b8471" },
});

export async function renderMinutesPdf(params: {
  minutes: Minutes & { signedBy: { firstName: string; lastName: string } | null };
  snapshot: MinutesSnapshot;
  company: Organization;
  minutesNumber: number;
  currentBoardMembers: { name: string; jobTitle: string }[];
}) {
  const { minutes, snapshot, company, minutesNumber, currentBoardMembers } = params;
  const boardMembers = snapshot.boardMembers ?? currentBoardMembers;

  const doc = (
    <Document
      title={`Verbale CdA n. ${minutesNumber}`}
      author={company.name}
      subject="Verbale del Consiglio di Amministrazione"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBlock}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyMeta}>
            {company.legalForm} — Sede legale: {company.registeredOffice}
            {company.taxId ? ` — C.F./P.IVA: ${company.taxId}` : ""}
          </Text>
        </View>

        <Text style={styles.title}>VERBALE DEL CONSIGLIO DI AMMINISTRAZIONE</Text>
        <Text style={styles.subtitle}>Verbale n. {minutesNumber}</Text>
        <Text style={styles.subtitle}>
          Periodo di riferimento: dal {formatDateLong(minutes.periodStart)} al{" "}
          {formatDateLong(minutes.periodEnd)}
        </Text>
        <Text style={styles.subtitle}>Redatto il {formatDateLong(minutes.createdAt)}</Text>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Il presente verbale raccoglie le delibere assunte dal Consiglio di Amministrazione
            tramite la piattaforma di voto elettronico CdaDecisor nel periodo sopra indicato,
            ciascuna approvata o respinta a seguito di votazione individuale e motivata da parte
            dei singoli consiglieri, secondo le modalità previste dallo Statuto sociale.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consiglio di Amministrazione in carica</Text>
          {boardMembers.map((m, i) => (
            <View key={i} style={styles.boardRow}>
              <Text style={styles.boardName}>
                {m.name}
                {snapshot.presidentName === m.name ? "  (Presidente)" : ""}
              </Text>
              <Text style={styles.boardRole}>{m.jobTitle}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delibere assunte nel periodo ({snapshot.proposals.length})</Text>
          {snapshot.proposals.length === 0 ? (
            <Text style={styles.emptyNotice}>
              Nel periodo di riferimento il Consiglio non ha assunto alcuna delibera.
            </Text>
          ) : (
            snapshot.proposals.map((p, index) => (
              <View key={p.id} style={styles.delibera} wrap={false}>
                <Text style={styles.deliberaTitle}>
                  Delibera n. {index + 1} — {p.title}
                </Text>
                <Text style={styles.deliberaMeta}>
                  Proponente: {p.authorName} · Chiusa il {p.closedAt ? formatDateLong(new Date(p.closedAt)) : "—"} ·
                  Esito:{" "}
                  <Text style={p.outcome === "APPROVED" ? styles.outcomeApproved : styles.outcomeRejected}>
                    {p.outcome === "APPROVED" ? "APPROVATA" : "RESPINTA"}
                  </Text>
                </Text>
                <Text style={styles.paragraph}>{p.description}</Text>

                {p.votes.map((v, i) => (
                  <View key={i} style={styles.voteRow}>
                    <Text style={styles.voteMark}>{v.choice === "YES" ? "✓" : "✕"}</Text>
                    <Text>
                      <Text style={styles.voteName}>{v.memberName}: </Text>
                      <Text style={styles.voteMotivation}>
                        {v.choice === "YES" ? "Favorevole" : "Contrario"} — {v.motivation}
                      </Text>
                    </Text>
                  </View>
                ))}

                {p.staffFeedback.length > 0 && (
                  <>
                    <Text style={styles.feedbackBlockTitle}>Pareri consultivi dello staff (non vincolanti)</Text>
                    {p.staffFeedback.map((f, i) => (
                      <View key={i} style={styles.voteRow}>
                        <Text style={styles.voteMark}>{f.preference === "POSITIVE" ? "+" : "–"}</Text>
                        <Text>
                          <Text style={styles.voteName}>{f.memberName}: </Text>
                          <Text style={styles.voteMotivation}>{f.comment}</Text>
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {p.attachments.length > 0 && (
                  <Text style={styles.attachmentsLine}>
                    Allegati: {p.attachments.map((a) => `${a.filename} (${humanFileSize(a.size)})`).join("; ")}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.closing} wrap={false}>
          <Text style={styles.paragraph}>
            Il presente verbale è stato redatto in forma elettronica dalla piattaforma CdaDecisor
            sulla base delle votazioni individuali registrate dal sistema, ed è destinato
            all&apos;inserimento nel registro dei verbali del Consiglio di Amministrazione.
          </Text>

          {minutes.signedAt && minutes.signedBy ? (
            <Text style={styles.signedNotice}>
              Firmato elettronicamente da {minutes.signedBy.firstName} {minutes.signedBy.lastName} (Presidente) il{" "}
              {formatDateTime(minutes.signedAt)}. Firma elettronica in modalità dimostrativa: non
              costituisce ancora firma con valore legale equivalente alla sottoscrizione autografa ai
              sensi del Regolamento (UE) 910/2014 (eIDAS).
            </Text>
          ) : (
            <Text style={styles.signedNotice}>
              Verbale in attesa di sottoscrizione da parte del Presidente
              {snapshot.presidentName ? ` (${snapshot.presidentName})` : ""}.
            </Text>
          )}

          <View style={styles.signatureBlock}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>
                Il Presidente {snapshot.presidentName ?? ""}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote} fixed>
          Documento generato automaticamente da CdaDecisor — {company.name}
        </Text>
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
