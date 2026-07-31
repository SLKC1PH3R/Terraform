import { redirect } from "next/navigation";

export default function EditTemplateRedirect({ params }: { params: { id: string } }) {
  redirect(`/?view=editor&template=${params.id}`);
}
