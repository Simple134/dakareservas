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
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Plus, Users, Search } from "lucide-react";
import AddBeneficiaryModal from "@/src/components/AddBeneficiaryModal";
import type { GestionoBeneficiary } from "@/src/types/gestiono";

interface PersonnelModuleProps {
  projectId: string | number;
}

export function PersonnelModule({ projectId }: PersonnelModuleProps) {
  const [beneficiaries, setBeneficiaries] = useState<GestionoBeneficiary[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editBeneficiary, setEditBeneficiary] =
    useState<GestionoBeneficiary | null>(null);

  const fetchBeneficiaries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/gestiono/beneficiaries?withContacts=true&withTaxData=false`,
      );

      if (response.ok) {
        const data: GestionoBeneficiary[] = await response.json();
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

  const handleEditClick = (beneficiary: GestionoBeneficiary) => {
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

  const getContactByType = (
    beneficiary: GestionoBeneficiary,
    type: string,
  ): string => {
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Trabajadores
                </p>
                <p className="text-2xl font-bold">{beneficiaries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-bold text-sm">2%</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retención ISR</p>
                <p className="text-2xl font-bold">2%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workers Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Planilla de Personal</CardTitle>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Trabajador
            </Button>
          </div>
          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 rounded animate-pulse"
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
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {searchTerm
                        ? "No se encontraron resultados"
                        : "No hay trabajadores con retención 2% registrados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBeneficiaries.map((person) => (
                    <TableRow
                      key={person.id}
                      className="cursor-pointer hover:bg-gray-50"
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
                      <TableCell className="text-muted-foreground">
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
                    | "string"
                    | "json"
                    | "image"
                    | "date"
                    | undefined,
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
