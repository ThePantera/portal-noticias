import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/editorial/ContactForm";
import { InfoPage } from "@/components/editorial/InfoPage";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escribinos para avisar un error, mandar una sugerencia o hacer una consulta.",
  alternates: { canonical: "/contacto" },
};

const INTRO = "Escribinos para avisar un error en una nota, sugerir un tema o hacer cualquier consulta.";

const HINT =
  "Si es por un error, pegá el enlace de la nota. Tu correo sólo se usa para responderte y no se publica.";

export default function ContactPage() {
  return (
    <InfoPage kicker="El diario" title="Contacto" intro={INTRO}>
      <p>{HINT}</p>
      <div className="font-ui">
        <ContactForm />
      </div>
      <p>
        <Link href="/privacidad">Leé la política de privacidad</Link>
      </p>
    </InfoPage>
  );
}
