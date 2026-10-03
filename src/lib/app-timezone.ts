// Fuso orario dell'azienda. In un file a sé, senza dipendenze, per poterlo importare
// anche dai moduli condivisi: i server di produzione (Vercel) girano in UTC, quindi
// ogni data o ora mostrata o confrontata deve indicare questo fuso in modo esplicito.
export const APP_TIMEZONE = "Europe/Rome";
