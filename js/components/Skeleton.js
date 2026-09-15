export function skeletonRows(count = 3, height = 52) {
  return Array.from({ length: count })
    .map(() => `<li class="skeleton-row" style="height:${height}px"></li>`)
    .join("");
}
