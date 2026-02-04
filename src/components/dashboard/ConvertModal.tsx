"use client";

import { useState } from "react";
import { X, Upload, FileText, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";

interface ConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  onConfirm: (metadata?: any) => Promise<void>;
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

  const { handleSubmit } = useForm<ConvertFormData>();

  const onSubmit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      let metadata = undefined;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/gestiono/uploadFile", {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Convertir a Factura
              </h3>
              <p className="text-sm text-gray-600">{invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {submitError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Comprobante / Documento Firmado (Opcional)
            </label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  {selectedFile
                    ? selectedFile.name
                    : "Click para subir archivo"}
                </p>
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
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                "Procesando..."
              ) : (
                <>
                  Confirmar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
