import { BoundingBox } from '../types/vision';

/**
 * Normalizes pixel bounding box [x, y, width, height] from COCO-SSD to normalized { ymin, xmin, ymax, xmax } [0, 1]
 */
export function normalizeCocoBox(
  x: number,
  y: number,
  width: number,
  height: number,
  imgWidth: number,
  imgHeight: number
): BoundingBox {
  if (imgWidth <= 0 || imgHeight <= 0) {
    return { ymin: 0, xmin: 0, ymax: 1, xmax: 1 };
  }

  const xmin = Math.max(0, Math.min(1, x / imgWidth));
  const ymin = Math.max(0, Math.min(1, y / imgHeight));
  const xmax = Math.max(0, Math.min(1, (x + width) / imgWidth));
  const ymax = Math.max(0, Math.min(1, (y + height) / imgHeight));

  return { ymin, xmin, ymax, xmax };
}

/**
 * Converts a normalized bounding box [0, 1] or [0, 1000] to pixel coordinates for canvas rendering
 */
export function denormalizeBox(
  box: BoundingBox,
  renderWidth: number,
  renderHeight: number
): { x: number; y: number; width: number; height: number } {
  // Support both [0, 1] float bounds and [0, 1000] integer bounds from vision models
  const normXmin = box.xmin > 1 ? box.xmin / 1000 : box.xmin;
  const normYmin = box.ymin > 1 ? box.ymin / 1000 : box.ymin;
  const normXmax = box.xmax > 1 ? box.xmax / 1000 : box.xmax;
  const normYmax = box.ymax > 1 ? box.ymax / 1000 : box.ymax;

  const x = Math.round(normXmin * renderWidth);
  const y = Math.round(normYmin * renderHeight);
  const width = Math.max(0, Math.round((normXmax - normXmin) * renderWidth));
  const height = Math.max(0, Math.round((normYmax - normYmin) * renderHeight));

  return { x, y, width, height };
}

/**
 * Hit test to check if a point (px, py in canvas pixels) is inside a bounding box
 */
export function isPointInsideBox(
  px: number,
  py: number,
  box: BoundingBox,
  renderWidth: number,
  renderHeight: number,
  tolerance = 12
): boolean {
  const { x, y, width, height } = denormalizeBox(box, renderWidth, renderHeight);
  return (
    px >= x - tolerance &&
    px <= x + width + tolerance &&
    py >= y - tolerance &&
    py <= y + height + tolerance
  );
}

/**
 * Calculates Intersection-over-Union (IoU) between two normalized bounding boxes
 */
export function calculateIoU(a: BoundingBox, b: BoundingBox): number {
  const xLeft = Math.max(a.xmin, b.xmin);
  const yTop = Math.max(a.ymin, b.ymin);
  const xRight = Math.min(a.xmax, b.xmax);
  const yBottom = Math.min(a.ymax, b.ymax);

  if (xRight <= xLeft || yBottom <= yTop) {
    return 0;
  }

  const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
  const areaA = (a.xmax - a.xmin) * (a.ymax - a.ymin);
  const areaB = (b.xmax - b.xmin) * (b.ymax - b.ymin);
  const unionArea = areaA + areaB - intersectionArea;

  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

/**
 * Formats confidence score (0-1) as percentage string
 */
export function formatConfidence(score: number): string {
  const clamped = Math.max(0, Math.min(1, score));
  return `${Math.round(clamped * 100)}%`;
}

/**
 * Strips data URI header and returns raw base64 string and mimeType
 */
export function parseDataUri(dataUri: string): { mimeType: string; base64: string } {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      base64: match[2],
    };
  }
  return {
    mimeType: 'image/jpeg',
    base64: dataUri,
  };
}

/**
 * Maps screen coordinates (clientX, clientY) on an object-contain element to internal canvas pixel coordinates,
 * taking into account letterboxing or pillarboxing margins.
 */
export function calculateLetterboxCoords(
  clientX: number,
  clientY: number,
  elementRect: { left: number; top: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  if (elementRect.width <= 0 || elementRect.height <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return { x: 0, y: 0 };
  }

  const canvasRatio = canvasWidth / canvasHeight;
  const elementRatio = elementRect.width / elementRect.height;
  let renderWidth = elementRect.width;
  let renderHeight = elementRect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (elementRatio > canvasRatio) {
    // Element is wider than canvas -> pillarbox (margins on left and right)
    renderWidth = elementRect.height * canvasRatio;
    offsetX = (elementRect.width - renderWidth) / 2;
  } else {
    // Element is taller than canvas -> letterbox (margins on top and bottom)
    renderHeight = elementRect.width / canvasRatio;
    offsetY = (elementRect.height - renderHeight) / 2;
  }

  const mouseX = clientX - elementRect.left - offsetX;
  const mouseY = clientY - elementRect.top - offsetY;

  const x = mouseX * (canvasWidth / renderWidth);
  const y = mouseY * (canvasHeight / renderHeight);

  return { x, y };
}

