const ID_MIN = 20;
const ID_MAX = 128;

export function isValidContentPostId(id: string | undefined): boolean {
  if (id === undefined || id === null) return false;
  const trimmed = id.trim();
  if (trimmed.length < ID_MIN || trimmed.length > ID_MAX) return false;
  return /^[a-z0-9_-]+$/i.test(trimmed);
}
