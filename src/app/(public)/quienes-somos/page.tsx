import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/editorial/InfoPage";
import { env } from "@/server/env";

export const metadata: Metadata = {
  title: "Quiénes somos",
  description: `Qué es ${env.SITE_NAME}, cómo hacemos las notas y cómo pedir una corrección.`,
  alternates: { canonical: "/quienes-somos" },
};

const INTRO =
  "es un diario digital argentino de noticias generales: política, economía, sociedad, deportes, el mundo y más. Se lee gratis y sin registrarse.";

const NOTE_TYPES = [
  "Notas de la redacción, escritas y revisadas por personas.",
  "Notas elaboradas con inteligencia artificial sobre los temas que más se están siguiendo en el país. Un sistema detecta cuándo un mismo hecho aparece en varios medios y un modelo de lenguaje redacta una nota propia, con sus palabras.",
];

const AI_RULES = [
  "Sólo usan datos que aparecen en al menos dos fuentes periodísticas.",
  "Citan al pie los medios de donde salieron los datos, con un enlace a cada nota original.",
  "No inventan datos, cifras ni declaraciones, y no copian frases de otros medios.",
  "En hechos policiales y judiciales atribuyen la información y no nombran a menores ni a víctimas.",
  "Llevan un aviso al final que dice que fueron elaboradas con inteligencia artificial.",
];

const CORRECTIONS =
  "Si encontrás un error en una nota, avisanos con el enlace a la nota. Lo revisamos y, si corresponde, la corregimos.";

const NO_ACCOUNTS =
  "No hace falta crear una cuenta para leer. Contamos cuántas veces se lee cada nota, sin saber quién la lee.";

export default function AboutPage() {
  return (
    <InfoPage kicker="El diario" title="Quiénes somos" intro={`${env.SITE_NAME} ${INTRO}`}>
      <h2 id="como-trabajamos">Cómo hacemos las notas</h2>
      <p>Publicamos dos tipos de notas:</p>
      <ul>
        {NOTE_TYPES.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <p>Las notas elaboradas con inteligencia artificial siguen estas reglas:</p>
      <ul>
        {AI_RULES.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>

      <h2 id="correcciones">Errores y correcciones</h2>
      <p>{CORRECTIONS}</p>
      <p>
        <Link href="/contacto">Escribinos desde la página de contacto</Link>
      </p>

      <h2>Sin registro y sin cuentas</h2>
      <p>{NO_ACCOUNTS}</p>
      <p>
        <Link href="/privacidad">Leé la política de privacidad</Link>
      </p>
    </InfoPage>
  );
}
