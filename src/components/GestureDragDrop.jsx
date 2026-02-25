import React, { useRef, useEffect, useState } from 'react';

const GestureDragDrop = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [isPinched, setIsPinched] = useState(false);
    const [hoveredId, setHoveredId] = useState(null);

    // Refs for tracking drag state without triggering re-renders for every pixel move
    const objectsRef = useRef([
        { id: 1, x: 100, y: 100, color: '#FF6B6B', width: 150, height: 150, label: 'DRAG ME' },
        { id: 2, x: 300, y: 150, color: '#4ECDC4', width: 150, height: 150, label: 'GRAB ME' },
        { id: 3, x: 500, y: 200, color: '#FFE66D', width: 150, height: 150, label: 'HOLD ME' },
    ]);

    const activeObjectId = useRef(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const lastHoveredId = useRef(null);

    useEffect(() => {
        if (!window.Hands || !window.Camera) {
            console.error('MediaPipe scripts not loaded');
            return;
        }

        const hands = new window.Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });

        hands.onResults((results) => {
            if (!canvasRef.current || !videoRef.current) return;

            const canvasCtx = canvasRef.current.getContext('2d');
            const { width, height } = canvasRef.current;

            canvasCtx.clearRect(0, 0, width, height);

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];

                // Landmarks 4 is Thumb Tip, 8 is Index Tip
                const thumbTip = landmarks[4];
                const indexTip = landmarks[8];

                // Calculate Euclidean distance (normalized)
                const distance = Math.sqrt(
                    Math.pow(thumbTip.x - indexTip.x, 2) +
                    Math.pow(thumbTip.y - indexTip.y, 2)
                );

                // Convert normalized to pixel coordinates (inverted X for mirror)
                const cursorX = (1 - indexTip.x) * width;
                const cursorY = indexTip.y * height;

                // 1. Collision Detection & Hover State
                let currentlyHovered = null;
                if (!activeObjectId.current) {
                    const obj = objectsRef.current.find(o =>
                        cursorX >= o.x && cursorX <= o.x + o.width &&
                        cursorY >= o.y && cursorY <= o.y + o.height
                    );
                    if (obj) currentlyHovered = obj.id;
                } else {
                    currentlyHovered = activeObjectId.current;
                }

                if (currentlyHovered !== lastHoveredId.current) {
                    lastHoveredId.current = currentlyHovered;
                    setHoveredId(currentlyHovered);
                }

                // 2. Drag Logic
                if (distance < 0.05) { // Pinching
                    if (!activeObjectId.current) {
                        // Attempt to grab
                        if (currentlyHovered) {
                            activeObjectId.current = currentlyHovered;
                            const obj = objectsRef.current.find(o => o.id === activeObjectId.current);
                            dragOffset.current = {
                                x: cursorX - obj.x,
                                y: cursorY - obj.y
                            };
                            setIsPinched(true);
                        }
                    } else {
                        // Smoothly update position
                        const obj = objectsRef.current.find(o => o.id === activeObjectId.current);
                        if (obj) {
                            obj.x = cursorX - dragOffset.current.x;
                            obj.y = cursorY - dragOffset.current.y;

                            // Update DOM directly for high performance (Smooth movement)
                            const element = document.getElementById(`draggable-obj-${obj.id}`);
                            if (element) {
                                element.style.transform = `translate(${obj.x}px, ${obj.y}px) scale(1.15)`;
                                element.style.boxShadow = '0 30px 60px rgba(0,0,0,0.5)';
                                element.style.zIndex = '100';
                                element.style.borderColor = 'rgba(255,255,255,0.8)';
                            }
                        }
                    }
                } else { // Released
                    if (activeObjectId.current) {
                        const obj = objectsRef.current.find(o => o.id === activeObjectId.current);
                        const element = document.getElementById(`draggable-obj-${activeObjectId.current}`);
                        if (element) {
                            element.style.transform = `translate(${obj.x}px, ${obj.y}px) scale(1)`;
                            element.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
                            element.style.zIndex = '10';
                            element.style.borderColor = 'rgba(255,255,255,0.2)';
                        }
                    }
                    activeObjectId.current = null;
                    setIsPinched(false);
                }

                // 3. Draw 21 Hand Landmarks & Skeleton
                const connections = window.HAND_CONNECTIONS || (window.Hands && window.Hands.HAND_CONNECTIONS);

                // Draw Connections
                if (window.drawConnectors && connections) {
                    window.drawConnectors(canvasCtx, landmarks, connections, {
                        color: 'rgba(255, 255, 255, 0.4)',
                        lineWidth: 3
                    });
                }

                // Draw 21 Landmarks (Red points as requested)
                landmarks.forEach((pt, index) => {
                    const pxX = (1 - pt.x) * width;
                    const pxY = pt.y * height;

                    canvasCtx.beginPath();
                    canvasCtx.arc(pxX, pxY, index === 8 || index === 4 ? 8 : 4, 0, 2 * Math.PI);
                    canvasCtx.fillStyle = (index === 8 || index === 4) ? '#2ecc71' : '#ff4757';
                    canvasCtx.fill();
                    canvasCtx.strokeStyle = 'white';
                    canvasCtx.lineWidth = 1;
                    canvasCtx.stroke();
                });

                // Visual Feedback for Pinch Area
                canvasCtx.beginPath();
                canvasCtx.arc(cursorX, cursorY, 20, 0, 2 * Math.PI);
                canvasCtx.strokeStyle = distance < 0.05 ? '#2ecc71' : 'rgba(255,255,255,0.3)';
                canvasCtx.lineWidth = 3;
                canvasCtx.setLineDash([5, 5]);
                canvasCtx.stroke();
                canvasCtx.setLineDash([]);

            } else {
                setIsPinched(false);
                activeObjectId.current = null;
                if (lastHoveredId.current !== null) {
                    lastHoveredId.current = null;
                    setHoveredId(null);
                }
            }
        });

        const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
                await hands.send({ image: videoRef.current });
            },
            width: 1280,
            height: 720
        });

        camera.start().then(() => setModelLoaded(true));

        return () => {
            hands.close();
            camera.stop();
        };
    }, []);

    return (
        <div ref={containerRef} style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: '#0f0f12',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Outfit", sans-serif'
        }}>
            {/* Background Video (Lower opacity for better visibility of objects) */}
            <video
                ref={videoRef}
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    opacity: 0.3
                }}
            />

            {/* Gesture Landmarks Canvas */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 5,
                    pointerEvents: 'none'
                }}
                width={1280}
                height={720}
            />

            {!modelLoaded && (
                <div style={{
                    position: 'absolute',
                    zIndex: 200,
                    color: 'white',
                    fontSize: '1.2rem',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '20px 40px',
                    borderRadius: '24px',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '15px'
                }}>
                    <div className="loader" style={{
                        width: '30px',
                        height: '30px',
                        border: '3px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#3498db',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    Initializing Workspace...
                </div>
            )}

            {/* Draggable Objects Layer */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {objectsRef.current.map(obj => (
                    <div
                        key={obj.id}
                        id={`draggable-obj-${obj.id}`}
                        style={{
                            position: 'absolute',
                            width: obj.width,
                            height: obj.height,
                            backgroundColor: obj.color,
                            borderRadius: '32px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '1rem',
                            boxShadow: hoveredId === obj.id ? '0 20px 40px rgba(0,0,0,0.4)' : '0 10px 25px rgba(0,0,0,0.2)',
                            transform: `translate(${obj.x}px, ${obj.y}px) scale(${hoveredId === obj.id ? 1.05 : 1})`,
                            transition: activeObjectId.current === obj.id ? 'none' : 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            zIndex: hoveredId === obj.id ? 100 : 10,
                            border: `4px solid ${hoveredId === obj.id ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)'}`,
                            textAlign: 'center',
                            padding: '20px',
                            backdropFilter: 'blur(5px)',
                        }}
                    >
                        <span style={{ fontSize: '1.2rem', marginBottom: '8px' }}>📦</span>
                        {obj.label}
                    </div>
                ))}
            </div>

            {/* Status Bar */}
            <div style={{
                position: 'absolute',
                bottom: '40px',
                padding: '12px 24px',
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(15px)',
                borderRadius: '100px',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                zIndex: 150,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.9rem',
                letterSpacing: '0.5px'
            }}>
                <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: isPinched ? '#2ecc71' : '#ff4757',
                    boxShadow: `0 0 15px ${isPinched ? '#2ecc71' : '#ff4757'}`
                }} />
                {isPinched ? 'OBJECT GRABBED' : hoveredId ? 'READY TO GRAB' : 'MOVE CURSOR TO OBJECT'}
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default GestureDragDrop;
