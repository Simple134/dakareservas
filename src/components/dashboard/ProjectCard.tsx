import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge"; // Ensure Badge is created or create simplified version
import { Progress } from "@/src/components/ui/progress";
import { Calendar, MapPin, DollarSign, Percent } from "lucide-react";
import { Project } from "@/src/hooks/useProjects";

interface ProjectCardProps {
  project: Project;
  onSelect?: (project: Project) => void;
}

export function ProjectCard({ project, onSelect }: ProjectCardProps) {
  const getBadgeVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "planning":
        return "secondary";
      case "execution":
        return "default";
      case "completed":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "planning":
        return "Planificación";
      case "execution":
        return "Ejecución";
      case "completed":
        return "Completado";
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("es-DO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  return (
    <Card
      className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-primary hover:scale-[1.02]"
      onClick={() => onSelect?.(project)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Daka 2</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {project.client}
            </p>
          </div>
          <Badge variant={getBadgeVariant(project.status)}>
            {getStatusText(project.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{project.location}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium">{formatDate(project.startDate)}</p>
              <p className="text-muted-foreground">Inicio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium">{formatDate(project.endDate)}</p>
              <p className="text-muted-foreground">Fin</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progreso del Proyecto</span>
            <span className="font-medium">{project.completionPercentage}%</span>
          </div>
          <Progress value={project.completionPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <div className="text-sm">
              <p className="font-medium">
                {formatCurrency(project.totalBudget)}
              </p>
              <p className="text-muted-foreground">Presupuesto</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-blue-600" />
            <div className="text-sm">
              <p className="font-medium">{project.profitMargin}%</p>
              <p className="text-muted-foreground">Margen</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
