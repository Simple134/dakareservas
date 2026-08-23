"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Plus } from "lucide-react";
import { SearchInput } from "@/src/components/ui/search-input";
import { KPICard } from "@/src/components/dashboard/KPICard";
import AddBeneficiaryModal from "@/src/components/AddBeneficiaryModal";
import type { Beneficiary } from "@/src/types/erp";

interface PersonnelModuleProps {
  projectId: string | number;
}

export function PersonnelModule({ projectId }: PersonnelModuleProps) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editBeneficiary, setEditBeneficiary] = useState<Beneficiary | null>(
    null,
  );

  const fetchBeneficiaries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/erp/beneficiaries?withContacts=true&withTaxData=false`,
      );

      if (response.ok) {
        const data: Beneficiary[] = await response.json();
        // Filter beneficiaries that have 2% ISR retention (0.02)
        const workers = data.filter((b) => {
          const isr = b.metadata?.isrTaxRetention;
          return isr && Number(isr) === 0.02;
        });
        setBeneficiaries(workers);
      }
    } catch (error) {
      console.error("Error fetching beneficiaries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, [projectId]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditBeneficiary(null);
  };

  const handleSuccess = () => {
    fetchBeneficiaries();
  };

  const handleEditClick = (beneficiary: Beneficiary) => {
    setEditBeneficiary(beneficiary);
    setIsModalOpen(true);
  };

  const filteredBeneficiaries = beneficiaries.filter((b) => {
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    return (
      b.name.toLowerCase().includes(query) ||
      (b.taxId && b.taxId.toLowerCase().includes(query)) ||
      b.contacts?.some((c) => c.data.toLowerCase().includes(query))
    );
  });

  const getContactByType = (beneficiary: Beneficiary, type: string): string => {
    const contact = beneficiary.contacts?.find((c) => c.type === type);
    return contact?.data || "—";
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      CLIENT: "Cliente",
      PROVIDER: "Proveedor",
      ORGANIZATION: "Organización",
      EMPLOYEE: "Empleado",
      SELLER: "Vendedor",
      GOVERNMENT: "Gobierno",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* La segunda tarjeta decía «Retención ISR: 2 %» con un icono que también
          ponía «2 %»: era la misma constante escrita tres veces, no un dato. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KPICard
          loading={isLoading}
          kpi={{
            title: "Trabajadores en planilla",
            value: beneficiaries.length,
            icon: "Users",
            hint: "Con retención de ISR del 2 %",
          }}
        />
      </div>

      {/* Workers Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Planilla de personal</CardTitle>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Añadir trabajador
            </Button>
          </div>
          <SearchInput
            className="mt-2"
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder="Buscar por nombre, cédula o contacto…"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-paper-3 rounded animate-pulse"
                />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cédula / RNC</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">ISR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBeneficiaries.length === 0 ? (
                  <TableEmpty colSpan={6}>
                    {searchTerm
                      ? `Nadie coincide con «${searchTerm}».`
                      : "No hay trabajadores con retención del 2 % registrados."}
                  </TableEmpty>
                ) : (
                  filteredBeneficiaries.map((person) => (
                    <TableRow
                      key={person.id}
                      className="cursor-pointer hover:bg-paper-2"
                      onClick={() => handleEditClick(person)}
                    >
                      <TableCell className="font-medium">
                        {person.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTypeLabel(person.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-ink-2">
                        {person.taxId || "—"}
                      </TableCell>
                      <TableCell>{getContactByType(person, "phone")}</TableCell>
                      <TableCell>{getContactByType(person, "email")}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">2%</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddBeneficiaryModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        beneficiaryData={
          editBeneficiary
            ? {
                name: editBeneficiary.name,
                type: editBeneficiary.type,
                contact: editBeneficiary.contacts?.map((c) => ({
                  id: c.id,
                  type: c.type,
                  data: c.data,
                  dataType: c.dataType as
                    "string" | "json" | "image" | "date" | undefined,
                  beneficiaryId: c.beneficiaryId,
                })) || [{ type: "phone", data: "", dataType: "string" }],
                taxId: editBeneficiary.taxId || undefined,
                reference: editBeneficiary.reference || undefined,
                creditLimit: editBeneficiary.creditLimit || undefined,
              }
            : undefined
        }
        beneficiaryId={editBeneficiary?.id}
        isrTaxRetention={
          editBeneficiary?.metadata?.isrTaxRetention
            ? String(editBeneficiary.metadata.isrTaxRetention)
            : "0.02"
        }
      />
    </div>
  );
}
