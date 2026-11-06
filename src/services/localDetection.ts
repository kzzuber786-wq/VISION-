import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { DetectedEntity } from '../types/vision';
import { normalizeCocoBox } from '../utils/visionMath';

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let isModelReady = false;

/**
 * Initializes TensorFlow backend and downloads/caches COCO-SSD model
 */
export async function getDetectorModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        await tf.ready();
        const model = await cocoSsd.load({
          base: 'lite_mobilenet_v2', // Fast, low-latency, mobile and desktop responsive
        });
        isModelReady = true;
        return model;
      } catch (err) {
        console.warn('TensorFlow/COCO-SSD initialization notice:', err);
        throw err;
      }
    })();
  }
  return modelPromise;
}

export function isDetectorReady(): boolean {
  return isModelReady;
}

/**
 * Detects objects in an HTMLVideoElement or HTMLImageElement using real COCO-SSD model
 */
export async function detectObjectsLocally(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  confidenceThreshold = 0.45
): Promise<DetectedEntity[]> {
  try {
    const model = await getDetectorModel();
    const predictions = await model.detect(source, 10, confidenceThreshold);

    const sourceWidth = (source as HTMLVideoElement).videoWidth || (source as HTMLImageElement).naturalWidth || source.width || 640;
    const sourceHeight = (source as HTMLVideoElement).videoHeight || (source as HTMLImageElement).naturalHeight || source.height || 480;

    return predictions.map((pred, index) => {
      const [x, y, w, h] = pred.bbox;
      const normalizedBox = normalizeCocoBox(x, y, w, h, sourceWidth, sourceHeight);

      return {
        id: `local_${pred.class}_${index}_${Date.now()}`,
        name: capitalizeFirst(pred.class),
        category: categorizeClass(pred.class),
        confidence: Math.round(pred.score * 100) / 100,
        box: normalizedBox,
        pixelBox: { x, y, width: w, height: h },
        source: 'local_coco',
        summary: `Physical ${pred.class} recognized with ${Math.round(pred.score * 100)}% detection certainty.`,
      };
    });
  } catch (error) {
    console.error('Local object detection error:', error);
    return [];
  }
}

function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function categorizeClass(cls: string): string {
  const categories: Record<string, string> = {
    person: 'Human Presence',
    cell_phone: 'Electronics & Mobile',
    laptop: 'Computing Device',
    mouse: 'Computer Peripheral',
    keyboard: 'Computer Peripheral',
    book: 'Media & Literature',
    cup: 'Container & Tableware',
    bottle: 'Beverage Vessel',
    chair: 'Furniture & Seating',
    couch: 'Furniture & Seating',
    bed: 'Furniture',
    tv: 'Display Monitor',
    backpack: 'Luggage & Carrying',
    umbrella: 'Accessories',
    clock: 'Timekeeping Device',
    vase: 'Decor & Ceramic',
    scissors: 'Tools & Cutlery',
    fork: 'Cutlery',
    knife: 'Cutlery',
    spoon: 'Cutlery',
    banana: 'Produce & Flora',
    apple: 'Produce & Flora',
    orange: 'Produce & Flora',
    car: 'Vehicular Transit',
    bicycle: 'Personal Mobility',
    motorcycle: 'Vehicular Transit',
    dog: 'Fauna & Domestic',
    cat: 'Fauna & Domestic',
  };

  return categories[cls.toLowerCase()] || 'Physical Object';
}
