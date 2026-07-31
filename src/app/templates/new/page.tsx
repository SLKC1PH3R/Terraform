import { redirect } from "next/navigation";

export default function NewTemplateRedirect() {
  redirect("/?view=editor");
}
