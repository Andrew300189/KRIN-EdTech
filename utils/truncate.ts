export function truncate(value: string, length = 80) {
  return value.length > length ? `${value.slice(0, length)}...` : value;
}
