"use client";

import { ExternalLink } from "lucide-react";
import { Modal } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";

/* El visor de comprobantes y su `getFileProxyUrl` estaban copiados en la ruta
 * de facturas y en el módulo financiero del proyecto, línea por línea. */

/** Los adjuntos vienen con la URL del ERP: se reescriben contra el proxy
 *  propio, que es quien aplica la lista blanca de tipos MIME. */
export function getFileProxyUrl(erpUrl: string): string {
  try {
    const url = new URL(erpUrl);
    const key = url.searchParams.get("key");
    const organizationId = url.searchParams.get("organizationId");
    if (key && organizationId) {
      return `/api/erp/file?key=${encodeURIComponent(key)}&organizationId=${encodeURIComponent(organizationId)}`;
    }
  } catch {}
  return erpUrl;
}

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName?: string | null;
}

export function FilePreviewModal({
  open,
  onClose,
  fileUrl,
  fileName,
}: FilePreviewModalProps) {
  if (!fileUrl) return null;

  const proxyUrl = getFileProxyUrl(fileUrl);
  const esPdf = fileName?.toLowerCase().endsWith(".pdf");

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={fileName || "Comprobante"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="outline" asChild>
            <a href={proxyUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Abrir en pestaña nueva
            </a>
          </Button>
        </>
      }
    >
      {esPdf ? (
        <iframe
          src={proxyUrl}
          className="h-[60vh] min-h-80 w-full rounded-[8px] border border-rule"
          title={fileName || "Comprobante"}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxyUrl}
          alt={fileName || "Comprobante"}
          className="mx-auto h-auto max-w-full rounded-[8px] border border-rule"
        />
      )}
    </Modal>
  );
}
