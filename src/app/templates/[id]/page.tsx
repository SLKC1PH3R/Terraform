import { prisma } from "@/lib/prisma";
import TemplateEditor from "@/components/TemplateEditor";
import { notFound } from "next/navigation";

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
  const template = await prisma.template.findUnique({
    where: { id: params.id },
    include: { variables: { orderBy: { order: "asc" } } },
  });

  if (!template) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Modifier — {template.name}</h1>
      <TemplateEditor
        initial={{
          id: template.id,
          name: template.name,
          category: template.category,
          description: template.description || "",
          tfContent: template.tfContent || "",
          variables: template.variables.map((v) => ({
            name: v.name,
            type: v.type,
            defaultValue: v.defaultValue || "",
            description: v.description || "",
            required: v.required,
          })),
        }}
      />
    </div>
  );
}
