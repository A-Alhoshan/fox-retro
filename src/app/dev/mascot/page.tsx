import { notFound } from "next/navigation";
import { MascotGallery } from "./MascotGallery";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MascotGallery />;
}
