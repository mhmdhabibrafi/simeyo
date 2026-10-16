export function cropRectangle(
  width: number,
  height: number,
  aspect: number,
  zoom: number,
  x: number,
  y: number,
) {
  const cropWidth =
    Math.min(width, height * aspect) / Math.max(1, Math.min(3, zoom));
  const cropHeight = cropWidth / aspect;
  return {
    x: (width - cropWidth) * Math.max(0, Math.min(1, x)),
    y: (height - cropHeight) * Math.max(0, Math.min(1, y)),
    width: cropWidth,
    height: cropHeight,
  };
}
