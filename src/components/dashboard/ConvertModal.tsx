"use client";

import { useState } from "react";
import { X, Upload, FileText, ArrowRight } from "lucide-react";
import { Modal } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";
import { useForm } from "react-hook-form";

interface ConvertMetadata {
  files: { s3Key: string; fileName: string }[];
  reference?: string;
}

interface ConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  onConfirm: (metadata?: ConvertMetadata) => Promise<void>;
}

interface ConvertFormData {
  file: FileList;
}

export function ConvertModal({
  isOpen,
  onClose,
  invoiceNumber,
  onConfirm,
}: ConvertModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");

  const { handleSubmit } = useForm<ConvertFormData>();

  const onSubmit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      let metadata = undefined;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/erp/uploadFile", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Error al subir el comprobante");
        }

        const uploadData = await uploadRes.json();
        const s3Key = uploadData.file.public || uploadData.file.url;

        metadata = {
          files: [
            {
              s3Key: s3Key,
              fileName: selectedFile.name,
            },
          ],
          ...(reference.trim() ? { reference: reference.trim() } : {}),
        };
      }

      // If no file but there's a reference, still pass metadata with reference
      if (!metadata && reference.trim()) {
        metadata = {
          files: [],
          reference: reference.trim(),
        };
      }

      await onConfirm(metadata);
      onClose();
    } catch (error) {
      console.error("❌ Error converting record:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Error al convertir el documento",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const FORM_ID = "convertir-documento";

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="sm"
      busy={isSubmitting}
      title="Convertir a factura"
      description={`${invoiceNumber} · el comprobante es opcional`}
      footer={
        <>
          {submitError && (
            <p role="alert" className="mr-auto text-[0.75rem] text-danger">
              {submitError}
            </p>
          )}
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Convertir
            <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={2} />
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div>
          <label className="eyebrow mb-1.5 block">
            Comprobante / Documento Firmado
          </label>
          {selectedFile && selectedFile.type.startsWith("image/") ? (
            <div className="relative w-full rounded-lg border-2 border-info/20 bg-info-soft overflow-hidden">
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                className="w-full max-h-48 object-contain"
              />
              <div className="flex items-center justify-between px-3 py-2 bg-paper border-t border-info/20">
                <p className="text-sm text-ink-2 truncate flex-1">
                  {selectedFile.name}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="ml-2 p-1 text-ink-3 hover:text-danger transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : selectedFile ? (
            <div className="flex items-center gap-3 w-full p-4 border-2 border-info/20 bg-info-soft rounded-lg">
              <FileText className="w-8 h-8 text-info flex-shrink-0" />
              <p className="text-sm text-ink-2 truncate flex-1">
                {selectedFile.name}
              </p>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-1 text-ink-3 hover:text-danger transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-rule-strong border-dashed rounded-lg cursor-pointer bg-paper-2 hover:bg-paper-3 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-ink-3 mb-2" />
                <p className="text-sm text-ink-3">Click para subir archivo</p>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                accept="image/*,application/pdf"
              />
            </label>
          )}
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Número de Comprobante</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ej: NCF-B0100000001"
            className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold"
          />
        </div>
      </form>
    </Modal>
  );
}
