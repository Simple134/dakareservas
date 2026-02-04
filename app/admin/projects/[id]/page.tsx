import { notFound } from "next/navigation";
import { ProjectContent } from "./ProjectContent";
import { getDivisionById } from "@/src/lib/gestiono";

// Server Component - Obtiene los datos del proyecto
async function getDivisionData(projectId: string) {
  try {
    const id = parseInt(projectId);
    if (isNaN(id)) {
      return null;
    }

    const data = await getDivisionById(id);
    console.log(data);
    return Array.isArray(data) ? data[0] : data;
  } catch (error) {
    console.error("Error fetching division:", error);
    return null;
  }
}

export default async function ProjectOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const division = await getDivisionData(projectId);
  console.log(division);
  if (!division) {
    notFound();
  }

  return <ProjectContent initialDivision={division} projectId={projectId} />;
}
