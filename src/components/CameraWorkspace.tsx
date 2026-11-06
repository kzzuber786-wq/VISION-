import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Upload,
  RefreshCw,
  Play,
  Pause,
  Scan,
  Sparkles,
  Maximize2,
  Crosshair,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { DetectedEntity } from '../types/vision';
import { detectObjectsLocally, isDetectorReady } from '../services/localDetection';
import { denormalizeBox, isPointInsideBox, calculateLetterboxCoords } from '../utils/visionMath';


interface CameraWorkspaceProps {
  activeTab: 'camera' | 'upload';
  isAnalyzing: boolean;
  analysisStage: number; // 0: idle, 1: received, 2: detecting, 3: understanding, 4: insights, 5: complete
  detectedObjects: DetectedEntity[];
  selectedObject: DetectedEntity | null;
  onSelectObject: (obj: DetectedEntity | null) => void;
  onCaptureAndAnalyze: (imageDataUri: string) => void;
  confidenceThreshold: number;
  currentImage: string | null;
  onSetCurrentImage: (dataUri: string) => void;
  className?: string;
}

export const CameraWorkspace: React.FC<CameraWorkspaceProps> = ({
  activeTab,
  isAnalyzing,
  analysisStage,
  detectedObjects,
  selectedObject,
  onSelectObject,
  onCaptureAndAnalyze,
  confidenceThreshold,
  currentImage,
  onSetCurrentImage,
  className = '',
}) => {

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [localDetections, setLocalDetections] = useState<DetectedEntity[]>([]);
  const [isContinuousDetection, setIsContinuousDetection] = useState(true);

  // Curated high-fidelity generated sample images for zero-friction physical world testing
  const sampleImages = [
    {
      title: 'Microcontroller Circuit',
      desc: 'Electronics & embedded board',
      url: '/src/assets/images/microcontroller_circuit_1793983803442.jpg',
    },
    {
      title: 'Mechanical Watch Internals',
      desc: 'Precision horology gears',
      url: '/src/assets/images/mechanical_watch_gears_1793983803099.jpg',
    },
    {
      title: 'Camera Lens Assembly',
      desc: 'Optical glass & mechanical aperture',
      url: '/src/assets/images/camera_lens_assembly_1793983804185.jpg',
    },
    {
      title: 'Espresso Extraction Machine',
      desc: 'Hydraulic pressure & thermal brass',
      url: '/src/assets/images/espresso_machine_mechanism_1793983803481.jpg',
    },
  ];

  // Enumerate video devices
  useEffect(() => {
    async function getCameras() {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = deviceList.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      } catch (err) {
        console.warn('Unable to enumerate cameras:', err);
      }
    }
    if (navigator.mediaDevices) {
      getCameras();
    }
  }, []);

  // Start webcam
  const startCamera = async (deviceId?: string) => {
    setCameraError(null);
    try {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraRunning(true);
        setIsStreamPaused(false);
      }
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : err.message || 'Failed to start webcam.'
      );
      setIsCameraRunning(false);
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraRunning(false);
    setIsStreamPaused(false);
  };

  // Toggle pause
  const togglePauseStream = () => {
    if (!videoRef.current) return;
    if (isStreamPaused) {
      videoRef.current.play();
      setIsStreamPaused(false);
    } else {
      videoRef.current.pause();
      setIsStreamPaused(true);
    }
  };

  // Run real local COCO-SSD detection periodically when camera is running
  useEffect(() => {
    let animationFrameId: number;
    let lastDetectionTime = 0;
    const intervalMs = 400; // 2.5 FPS local object detection loop (smooth, CPU-efficient)

    const runDetectionLoop = async (time: number) => {
      if (
        isCameraRunning &&
        !isStreamPaused &&
        isContinuousDetection &&
        videoRef.current &&
        videoRef.current.readyState >= 2
      ) {
        if (time - lastDetectionTime > intervalMs) {
          lastDetectionTime = time;
          try {
            const detected = await detectObjectsLocally(videoRef.current, confidenceThreshold);
            setLocalDetections(detected);
          } catch (e) {
            // ignore frame error
          }
        }
      }
      animationFrameId = requestAnimationFrame(runDetectionLoop);
    };

    if (isCameraRunning && !isStreamPaused && isContinuousDetection) {
      animationFrameId = requestAnimationFrame(runDetectionLoop);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isCameraRunning, isStreamPaused, isContinuousDetection, confidenceThreshold]);

  // Combine objects to draw on canvas: Gemini visual detections take precedence, fallback to local
  const activeObjects = detectedObjects.length > 0 ? detectedObjects : localDetections;

  // Render bounding boxes and reticles on canvas
  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (activeObjects.length === 0) return;

    activeObjects.forEach((obj) => {
      if (!obj.box) return;
      const { x, y, width, height } = denormalizeBox(obj.box, canvas.width, canvas.height);
      const isSelected = selectedObject?.id === obj.id || selectedObject?.name === obj.name;

      // Color scheme
      const strokeColor = isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.7)';
      const fillColor = isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.04)';

      // Bounding box fill
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, width, height);

      // Bounding box stroke
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeStyle = strokeColor;
      ctx.strokeRect(x, y, width, height);

      // Tech bracket corner accents
      const cornerLen = Math.min(14, width / 4, height / 4);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isSelected ? '#00f0ff' : '#38bdf8';

      // Top-Left corner
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();

      // Top-Right corner
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLen, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + cornerLen);
      ctx.stroke();

      // Bottom-Left corner
      ctx.beginPath();
      ctx.moveTo(x, y + height - cornerLen);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x + cornerLen, y + height);
      ctx.stroke();

      // Bottom-Right corner
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLen, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + width, y + height - cornerLen);
      ctx.stroke();

      // Tag Label Badge
      const labelText = `${obj.name} · ${Math.round(obj.confidence * 100)}%`;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      const textMetrics = ctx.measureText(labelText);
      const badgeWidth = textMetrics.width + 12;
      const badgeHeight = 20;

      const badgeY = y > 24 ? y - badgeHeight : y;

      ctx.fillStyle = isSelected ? '#0369a1' : 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(x, badgeY, badgeWidth, badgeHeight);

      ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, badgeY, badgeWidth, badgeHeight);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, x + 6, badgeY + 14);
    });
  }, [activeObjects, selectedObject]);

  // Redraw when objects or dimensions change
  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Click on canvas to select object
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { x: clickX, y: clickY } = calculateLetterboxCoords(
      e.clientX,
      e.clientY,
      rect,
      canvas.width,
      canvas.height
    );

    // Find clicked object
    let hit: DetectedEntity | null = null;
    for (const obj of activeObjects) {
      if (obj.box && isPointInsideBox(clickX, clickY, obj.box, canvas.width, canvas.height, 16)) {
        hit = obj;
        break;
      }
    }

    onSelectObject(hit);
  };


  // Capture current frame from webcam or canvas
  const handleCapture = () => {
    let dataUri = '';
    if (isCameraRunning && videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const tCtx = tempCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        dataUri = tempCanvas.toDataURL('image/jpeg', 0.92);
      }
    } else if (currentImage) {
      dataUri = currentImage;
    }

    if (dataUri) {
      onSetCurrentImage(dataUri);
      onCaptureAndAnalyze(dataUri);
    }
  };

  // Upload image handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUri = event.target?.result as string;
      onSetCurrentImage(dataUri);

      // Run local COCO-SSD detection on the uploaded image
      const img = new Image();
      img.onload = async () => {
        const detected = await detectObjectsLocally(img, confidenceThreshold);
        setLocalDetections(detected);
      };
      img.src = dataUri;

      // Trigger Gemini Multimodal Analysis
      onCaptureAndAnalyze(dataUri);
    };
    reader.readAsDataURL(file);
  };

  // Load sample image
  const loadSampleImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result as string;
        onSetCurrentImage(dataUri);

        const img = new Image();
        img.onload = async () => {
          const detected = await detectObjectsLocally(img, confidenceThreshold);
          setLocalDetections(detected);
        };
        img.src = dataUri;

        onCaptureAndAnalyze(dataUri);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.warn('Sample fetch notice:', err);
      onSetCurrentImage(url);
      onCaptureAndAnalyze(url);
    }
  };

  return (
    <div className={`relative flex-1 flex flex-col bg-neutral-950 overflow-hidden border-b lg:border-b-0 lg:border-r border-neutral-800/80 ${className}`}>
      {/* Workspace Header Toolbar */}

      <div className="h-11 px-4 border-b border-neutral-800/80 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-between text-xs text-neutral-300 select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-neutral-200">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            {activeTab === 'camera' ? 'Visual Feed' : 'Optical Canvas'}
          </span>
          <span className="text-neutral-400">·</span>
          <span className="text-neutral-400 font-mono text-[11px]">
            {activeObjects.length} Entities Tracked
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'camera' && (
            <>
              {devices.length > 1 && (
                <select
                  aria-label="Select Camera Device"
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    if (isCameraRunning) startCamera(e.target.value);
                  }}
                  className="bg-neutral-800/80 border border-neutral-700 text-neutral-200 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
                >
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}

              {isCameraRunning && (
                <button
                  onClick={togglePauseStream}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] transition-colors"
                  title={isStreamPaused ? 'Resume Camera' : 'Pause Camera Frame'}
                >
                  {isStreamPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                  <span>{isStreamPaused ? 'Resume' : 'Freeze'}</span>
                </button>
              )}

              {currentImage && !isCameraRunning && (
                <button
                  onClick={() => {
                    onSetCurrentImage('');
                    onSelectObject(null);
                  }}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition-colors"
                  title="Clear current still frame and return to standby"
                >
                  Clear Still
                </button>
              )}

              <button
                onClick={() => (isCameraRunning ? stopCamera() : startCamera(selectedDeviceId))}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isCameraRunning
                    ? 'bg-rose-950/70 text-rose-300 border border-rose-500/40 hover:bg-rose-900/80'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
                }`}
              >
                {isCameraRunning ? <CameraOff className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                <span>{isCameraRunning ? 'Stop Feed' : 'Start Camera'}</span>
              </button>
            </>
          )}

          {activeTab === 'upload' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            >
              <Upload className="w-3 h-3 text-cyan-400" />
              <span>Choose Image</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Laser Scanline Effect during analysis */}
        {isAnalyzing && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-scanline z-20 pointer-events-none" />
        )}

        {/* Live Camera View */}
        {activeTab === 'camera' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                if (canvasRef.current && videoRef.current) {
                  canvasRef.current.width = videoRef.current.videoWidth || 1280;
                  canvasRef.current.height = videoRef.current.videoHeight || 720;
                  drawOverlay();
                }
              }}
              className={`max-w-full max-h-full object-contain ${!isCameraRunning ? 'hidden' : 'block'}`}
            />

            {!isCameraRunning && currentImage && (
              <img
                src={currentImage}
                alt="Analyzed target frame"
                onLoad={(e) => {
                  const target = e.currentTarget;
                  if (canvasRef.current) {
                    canvasRef.current.width = target.naturalWidth || 1200;
                    canvasRef.current.height = target.naturalHeight || 800;
                    drawOverlay();
                  }
                }}
                className="max-w-full max-h-full object-contain select-none z-0"
              />
            )}

            {/* Offline / Standby State for Camera */}
            {!isCameraRunning && !currentImage && (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md space-y-4 z-20">
                <div className="w-16 h-16 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-center text-neutral-500 shadow-inner">
                  <Camera className="w-8 h-8 text-cyan-400/80" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-neutral-200">Camera Feed Inactive</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Activate your camera to start real-time object detection and physical reasoning, or load sample imagery below.
                  </p>
                </div>

                {cameraError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
                    {cameraError}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => startCamera(selectedDeviceId)}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Launch Camera</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-all"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Upload Image</span>
                  </button>
                </div>

                {/* Quick Sample Selector */}
                <div className="pt-4 border-t border-neutral-800/80 w-full space-y-2">
                  <span className="text-[11px] text-neutral-400 block text-center">
                    Or explore high-resolution physical mechanisms:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-left">
                    {sampleImages.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => loadSampleImage(s.url)}
                        className="p-2 rounded-lg bg-neutral-900/60 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500/40 text-left transition-all group cursor-pointer"
                      >
                        <div className="text-[11px] font-medium text-neutral-200 group-hover:text-cyan-300 truncate">
                          {s.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload / Image Analysis View */}
        {activeTab === 'upload' && (
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {currentImage ? (
              <img
                src={currentImage}
                alt="Analyzed target frame"
                onLoad={(e) => {
                  const target = e.currentTarget;
                  if (canvasRef.current) {
                    canvasRef.current.width = target.naturalWidth || 1200;
                    canvasRef.current.height = target.naturalHeight || 800;
                    drawOverlay();
                  }
                }}
                className="max-w-full max-h-full object-contain select-none"
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-800 hover:border-cyan-500/50 rounded-2xl p-10 max-w-lg w-full flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-neutral-900/20 hover:bg-neutral-900/40 z-20"
              >
                <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-cyan-400 mb-4 shadow-inner">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-semibold text-neutral-200 mb-1">
                  Upload Physical Image or Blueprint
                </h4>
                <p className="text-xs text-neutral-400 mb-4 max-w-xs">
                  Drag and drop any photograph or scientific image (JPG, PNG, WebP) to inspect physical parts.
                </p>
                <button
                  type="button"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Browse Device Files
                </button>
              </div>
            )}
          </div>
        )}

        {/* Overlay Interactive Canvas for Bounding Boxes */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`absolute inset-0 w-full h-full object-contain cursor-crosshair z-10 ${
            !isCameraRunning && !currentImage ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        />

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Processing State Overlay with Progressive Steps */}
        {isAnalyzing && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900/90 border border-cyan-500/40 backdrop-blur-md rounded-xl px-5 py-3 shadow-[0_0_25px_rgba(6,182,212,0.2)] flex items-center gap-4 z-30 select-none">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-neutral-100 flex items-center gap-2">
                <span>
                  {analysisStage === 1 && 'Image Received'}
                  {analysisStage === 2 && 'Detecting Physical Entities'}
                  {analysisStage === 3 && 'Reasoning Scene & Architecture'}
                  {analysisStage === 4 && 'Generating Multimodal Insights'}
                  {analysisStage === 5 && 'Synthesizing Verified Data'}
                </span>
                <span className="font-mono text-[10px] text-cyan-400">
                  {analysisStage}/5
                </span>
              </div>
              <div className="w-48 h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${(analysisStage / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Floating Control Bar */}
        {(isCameraRunning || currentImage) && (
          <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-3 z-20 pointer-events-none">
            <div className="pointer-events-auto bg-neutral-950/80 backdrop-blur-md border border-neutral-800/90 rounded-full p-1.5 shadow-2xl flex items-center gap-2">
              {/* Capture & Analyze Action Button */}
              <button
                onClick={handleCapture}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                <Scan className="w-4 h-4" />
                <span>{isAnalyzing ? 'Analyzing...' : 'Capture & Analyze'}</span>
              </button>

              {/* Continuous Detection Toggle */}
              <button
                onClick={() => setIsContinuousDetection(!isContinuousDetection)}
                className={`p-2 rounded-full border text-xs transition-colors ${
                  isContinuousDetection
                    ? 'bg-neutral-800 text-cyan-300 border-neutral-700'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                }`}
                title={isContinuousDetection ? 'COCO-SSD tracking active' : 'COCO-SSD tracking paused'}
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
