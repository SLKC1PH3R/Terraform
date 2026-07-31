import { redirect } from "next/navigation";

export default function GenerateRedirect() {
  redirect("/?view=generate");
}
