import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCocoBox,
  denormalizeBox,
  isPointInsideBox,
  calculateIoU,
  formatConfidence,
  parseDataUri,
  calculateLetterboxCoords,
} from './visionMath';


test('normalizeCocoBox converts pixel coordinates to [0,1] normalized bounds', () => {
  const norm = normalizeCocoBox(100, 50, 200, 150, 1000, 500);
  assert.equal(norm.xmin, 0.1);
  assert.equal(norm.ymin, 0.1);
  assert.equal(norm.xmax, 0.3);
  assert.equal(norm.ymax, 0.4);
});

test('denormalizeBox scales normalized box back to canvas dimensions', () => {
  const box = { xmin: 0.2, ymin: 0.1, xmax: 0.6, ymax: 0.7 };
  const denorm = denormalizeBox(box, 1000, 500);
  assert.equal(denorm.x, 200);
  assert.equal(denorm.y, 50);
  assert.equal(denorm.width, 400);
  assert.equal(denorm.height, 300);

  // Test 0-1000 scale integer bounds
  const intBox = { xmin: 200, ymin: 100, xmax: 600, ymax: 700 };
  const intDenorm = denormalizeBox(intBox, 1000, 500);
  assert.equal(intDenorm.x, 200);
  assert.equal(intDenorm.y, 50);
  assert.equal(intDenorm.width, 400);
  assert.equal(intDenorm.height, 300);
});

test('isPointInsideBox detects points accurately with tolerance', () => {
  const box = { xmin: 0.2, ymin: 0.2, xmax: 0.8, ymax: 0.8 };
  // Target: x=200..800, y=200..800 at 1000x1000
  assert.equal(isPointInsideBox(500, 500, box, 1000, 1000), true);
  assert.equal(isPointInsideBox(195, 500, box, 1000, 1000, 10), true); // Within 10px tolerance
  assert.equal(isPointInsideBox(50, 50, box, 1000, 1000), false);
});

test('calculateIoU returns 1.0 for identical boxes and 0.0 for non-overlapping boxes', () => {
  const boxA = { xmin: 0.1, ymin: 0.1, xmax: 0.5, ymax: 0.5 };
  const boxB = { xmin: 0.1, ymin: 0.1, xmax: 0.5, ymax: 0.5 };
  const boxC = { xmin: 0.6, ymin: 0.6, xmax: 0.9, ymax: 0.9 };

  assert.equal(calculateIoU(boxA, boxB), 1.0);
  assert.equal(calculateIoU(boxA, boxC), 0.0);
});

test('formatConfidence formats percentage cleanly', () => {
  assert.equal(formatConfidence(0.954), '95%');
  assert.equal(formatConfidence(1.2), '100%');
  assert.equal(formatConfidence(-0.1), '0%');
});

test('parseDataUri extracts mimeType and payload', () => {
  const sample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const parsed = parseDataUri(sample);
  assert.equal(parsed.mimeType, 'image/png');
  assert.equal(parsed.base64.length > 10, true);
});

test('calculateLetterboxCoords accurately adjusts for letterbox and pillarbox margins', () => {
  // Test case 1: Element is 800x800, canvas is 800x400 (widescreen, ratio 2:1)
  // Element is taller -> letterboxed: renderHeight = 800 / 2 = 400.
  // offsetY = (800 - 400) / 2 = 200.
  // Click at screen center (400, 400):
  // mouseX = 400 - 0 = 400 -> x = 400 * (800/800) = 400
  // mouseY = 400 - 200 = 200 -> y = 200 * (400/400) = 200
  const letterboxResult = calculateLetterboxCoords(
    400,
    400,
    { left: 0, top: 0, width: 800, height: 800 },
    800,
    400
  );
  assert.equal(Math.round(letterboxResult.x), 400);
  assert.equal(Math.round(letterboxResult.y), 200);

  // Test case 2: Element is 1000x500, canvas is 500x500 (square 1:1)
  // Element is wider -> pillarbox: renderWidth = 500 * 1 = 500.
  // offsetX = (1000 - 500) / 2 = 250.
  // Click at center (500, 250):
  const pillarboxResult = calculateLetterboxCoords(
    500,
    250,
    { left: 0, top: 0, width: 1000, height: 500 },
    500,
    500
  );
  assert.equal(Math.round(pillarboxResult.x), 250);
  assert.equal(Math.round(pillarboxResult.y), 250);
});

