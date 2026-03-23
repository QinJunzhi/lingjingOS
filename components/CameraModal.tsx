import React, { useRef, useEffect, useState } from 'react';

interface CameraModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        // Request camera with preference for back camera on mobile
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('无法启动摄像头。请确保授予权限或使用HTTPS环境。');
        console.error("Camera Error: ", err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
          onClose();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white p-4 text-center gap-4">
            <i className="fas fa-exclamation-triangle text-4xl text-yellow-500"></i>
            <p>{error}</p>
            <button onClick={onClose} className="px-4 py-2 bg-gray-700 rounded text-sm">关闭</button>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="flex-1 w-full h-full object-cover"
          />
        )}
        
        {/* Overlay Controls */}
        {!error && (
          <div className="absolute bottom-0 left-0 w-full p-8 flex justify-between items-center bg-gradient-to-t from-black/80 to-transparent">
            <button 
              onClick={onClose}
              className="text-white w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/20 transition-all"
            >
              <i className="fas fa-times text-2xl"></i>
            </button>
            
            <button 
              onClick={handleCapture}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
            >
              <div className="w-16 h-16 bg-white rounded-full active:scale-90 transition-transform"></div>
            </button>
            
            <div className="w-12"></div> {/* Spacer for alignment */}
          </div>
        )}
      </div>
    </div>
  );
};