"use client";

import { useId, useRef, useState, useTransition } from "react";
import { prepareImageForUpload } from "@/lib/image-prep";
import type { EditorImage, UploadImageResult } from "@/types/media";

type Props = {
  initial: EditorImage | null;
  uploadAction: (formData: FormData) => Promise<UploadImageResult>;
  /** Avisa al formulario que hay cambios sin guardar. */
  onChange: () => void;
  errors: { mainImage?: string; mainImageAlt?: string; mainImageCaption?: string; mainImageCredit?: string };
};

const frame =
  "w-full rounded-md border border-rule bg-surface px-3 py-2 text-base text-ink aria-invalid:border-danger";
const label = "text-sm font-semibold text-ink";
const hint = "text-sm text-ink-subtle";
const button =
  "inline-flex min-h-10 items-center rounded-md border border-rule px-3 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50";

/**
 * Imagen principal de la nota. La foto se sube apenas se elige (así se ve enseguida),
 * pero queda enganchada a la nota recién al guardar, junto con su descripción y crédito.
 */
export function MainImageField({ initial, uploadAction, onChange, errors }: Props) {
  const [image, setImage] = useState(initial);
  const [alt, setAlt] = useState(initial?.alt ?? "");
  const [caption, setCaption] = useState(initial?.caption ?? "");
  const [credit, setCredit] = useState(initial?.credit ?? "");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const error = uploadError ?? errors.mainImage;

  function upload(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    startUpload(async () => {
      try {
        let prepared: Blob;
        try {
          prepared = await prepareImageForUpload(file);
        } catch (e) {
          // Estos mensajes ya están escritos para quien sube la foto.
          setUploadError(e instanceof Error ? e.message : "No se pudo procesar la imagen.");
          return;
        }
        const formData = new FormData();
        formData.append("file", prepared, file.name);
        const result = await uploadAction(formData);
        if (!result.ok) {
          setUploadError(result.message);
          return;
        }
        setImage(result.image);
        // Una foto nueva no hereda la descripción ni el crédito de la anterior.
        setAlt(result.image.alt);
        setCaption(result.image.caption ?? "");
        setCredit(result.image.credit ?? "");
        onChange();
      } catch {
        // Corte de red o pedido rechazado antes de llegar a la acción: sin detalles técnicos.
        setUploadError("No se pudo subir la imagen. Revisá la conexión y probá de nuevo.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  const picker = (
    <input
      ref={inputRef}
      id={`${id}-file`}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
      className="sr-only"
      onChange={(e) => upload(e.target.files?.[0])}
      disabled={uploading}
      aria-describedby={error ? `${id}-error` : `${id}-hint`}
    />
  );

  return (
    <fieldset className="grid gap-3" aria-busy={uploading}>
      <legend className={`${label} mb-1.5`}>Imagen principal</legend>
      <input type="hidden" name="mainImageId" value={image?.id ?? ""} />

      {image ? (
        <figure className="grid gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- variantes propias con srcset */}
          <img
            src={image.src}
            srcSet={image.srcSet}
            sizes="(min-width: 1024px) 40rem, 100vw"
            width={image.width}
            height={image.height}
            alt={alt || "Imagen principal sin descripción"}
            data-testid="main-image-preview"
            className="aspect-[3/2] w-full rounded-md border border-rule bg-paper object-cover"
          />
          <div className="flex flex-wrap gap-2">
            <label htmlFor={`${id}-file`} className={`${button} cursor-pointer`}>
              {uploading ? "Subiendo…" : "Cambiar imagen"}
            </label>
            {picker}
            <button
              type="button"
              className={button}
              disabled={uploading}
              onClick={() => {
                setImage(null);
                onChange();
              }}
            >
              Quitar
            </button>
          </div>
        </figure>
      ) : (
        <label
          htmlFor={`${id}-file`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files[0]);
          }}
          className={`grid min-h-36 cursor-pointer place-items-center rounded-md border border-dashed px-4 py-6 text-center ${dragging ? "border-ink bg-paper" : "border-rule bg-surface"}`}
        >
          <span className="grid gap-1">
            <span className="text-sm font-semibold text-ink">
              {uploading ? "Subiendo imagen…" : "Elegí una imagen o arrastrala acá"}
            </span>
            <span className={hint}>JPG, PNG, WebP o AVIF. Las fotos grandes se achican solas.</span>
          </span>
          {picker}
        </label>
      )}

      <p id={`${id}-hint`} className="sr-only">
        JPG, PNG, WebP o AVIF, de al menos 320 píxeles de ancho.
      </p>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {image ? (
        <div className="grid gap-3">
          <TextField
            id="mainImageAlt"
            label="Descripción de la imagen"
            value={alt}
            onChange={setAlt}
            maxLength={200}
            error={errors.mainImageAlt}
            hint="Qué se ve en la foto. La leen los lectores de pantalla y los buscadores."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="mainImageCaption"
              label="Epígrafe"
              value={caption}
              onChange={setCaption}
              maxLength={300}
              error={errors.mainImageCaption}
            />
            <TextField
              id="mainImageCredit"
              label="Crédito"
              value={credit}
              onChange={setCredit}
              maxLength={120}
              error={errors.mainImageCredit}
              placeholder="Foto: Nombre / Agencia"
            />
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}

function TextField({
  id,
  label: text,
  value,
  onChange,
  maxLength,
  error,
  hint: help,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  const describedBy = [error ? `${id}-error` : null, help ? `${id}-hint` : null].filter(Boolean).join(" ");
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <input
        id={id}
        name={id}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={frame}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {help ? (
        <p id={`${id}-hint`} className={hint}>
          {help}
        </p>
      ) : null}
    </div>
  );
}
