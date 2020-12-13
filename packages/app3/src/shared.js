import message from "app2/shared";
export default async function shared() {
  return (await import("./message")).default + "NEW MESSAGE" + (await message());
}
