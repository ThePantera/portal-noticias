import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/editorial/InfoPage";
import { env } from "@/server/env";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Qué datos usa ${env.SITE_NAME} y para qué. Sin registro y sin publicidad personalizada.`,
  alternates: { canonical: "/privacidad" },
};

const INTRO =
  "no tiene cuentas de lectores ni publicidad personalizada. Esto es todo lo que guardamos y para qué.";

const SECTIONS = [
  {
    title: "Lecturas",
    text: "Cuando abrís una nota, sumamos uno al contador de lecturas de esa nota en el día. No guardamos quién la leyó ni tu dirección IP, y no usamos cookies para eso.",
  },
  {
    title: "Reacciones",
    text: "Si reaccionás a una nota con un emoji, tu navegador recibe una cookie con un número al azar para que puedas cambiar o sacar tu reacción. Ese número y tu dirección IP se guardan sólo cifrados (en hash), para evitar abusos, y no sirven para identificarte.",
  },
  {
    title: "Formulario de contacto",
    text: "Si nos escribís, guardamos tu nombre, tu correo y el mensaje para poder responderte. La IP se guarda cifrada y sólo para frenar el spam. No compartimos esos datos con nadie.",
  },
  {
    title: "Preferencias",
    text: "El modo claro u oscuro se guarda en tu propio navegador y nunca llega a nuestros servidores.",
  },
  {
    title: "Servicios de terceros",
    text: "El sitio está alojado en Vercel y la base de datos, en Neon. El mapa de vuelos en vivo carga las imágenes del mapa desde OpenStreetMap y la biblioteca del mapa desde unpkg, así que tu navegador se conecta a esos servicios. Las cotizaciones, los mercados y los feriados los consulta nuestro servidor, no tu navegador.",
  },
  {
    title: "Tus derechos",
    text: "La Ley 25.326 de Protección de los Datos Personales te da derecho a acceder a tus datos, corregirlos y pedir que los borremos. Para hacerlo, escribinos desde la página de contacto.",
  },
];

export default function PrivacyPage() {
  return (
    <InfoPage kicker="El diario" title="Política de privacidad" intro={`${env.SITE_NAME} ${INTRO}`}>
      {SECTIONS.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <p className="mt-2">{section.text}</p>
        </section>
      ))}
      <p>
        <Link href="/contacto">Ir a la página de contacto</Link>
      </p>
    </InfoPage>
  );
}
