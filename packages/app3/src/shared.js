export default async function shared() {
  return (await import("./message")).default;
}
