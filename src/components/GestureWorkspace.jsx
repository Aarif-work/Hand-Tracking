import React, { useRef, useEffect, useState } from 'react';

const GestureWorkspace = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [modelLoaded, setModelLoaded] = useState(false);

    // Configuration
    const GRAB_START = 0.08;
    const GRAB_END = 0.12;
    const FRAME_HOLD = 2; // Made more responsive
    const SMOOTHING = 0.75; // Adjusted for better responsiveness with hand feed

    // Premium Generic Objects (Removed Logic Unit)
    const INITIAL_OBJECTS = [
        {
            id: 1, x: 150, y: 150, w: 180, h: 220,
            bg: 'rgba(255, 255, 255, 0.08)',
            accent: '#60a5fa',
            label: 'System Node',
            icon: '💠',
            style: { borderRadius: '24px', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.15)' }
        },
        {
            id: 2, x: 450, y: 100, w: 140, h: 140,
            bg: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)',
            accent: '#f472b6',
            label: 'Media Core',
            icon: '🌸',
            style: { borderRadius: '50%', boxShadow: '0 0 30px rgba(219, 39, 119, 0.4)' }
        },
        {
            id: 3, x: 750, y: 250, w: 220, h: 120,
            bg: 'rgba(0,0,0,0.4)',
            accent: '#fbbf24',
            label: 'Data Stream',
            icon: '⚡',
            style: { borderRadius: '30px', borderLeft: '6px solid #fbbf24', backdropFilter: 'blur(20px)' }
        }
    ];

    // Engine State
    const engine = useRef({
        objects: INITIAL_OBJECTS,
        activeId: null,
        hoverId: null,
        dragOffset: { x: 0, y: 0 },
        grabFrames: 0,
        releaseFrames: 0,
        isGrabbing: false,
        cursor: { x: 0, y: 0 },
    });

    useEffect(() => {
        if (!window.Hands || !window.Camera) return;

        const hands = new window.Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.8,
            minTrackingConfidence: 0.8
        });

        hands.onResults((results) => {
            if (!canvasRef.current) return;
            const state = engine.current;
            const canvasCtx = canvasRef.current.getContext('2d');
            const { width: W, height: H } = canvasRef.current;

            canvasCtx.clearRect(0, 0, W, H);

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];
                const thumb = landmarks[4];
                const index = landmarks[8];

                const dist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));
                const targetX = (1 - index.x) * W;
                const targetY = index.y * H;

                // Smoothing
                state.cursor.x += (targetX - state.cursor.x) * (1 - SMOOTHING);
                state.cursor.y += (targetY - state.cursor.y) * (1 - SMOOTHING);

                const { x: cx, y: cy } = state.cursor;

                // Pinch logic with Stability
                if (dist < GRAB_START) {
                    state.releaseFrames = 0;
                    if (!state.isGrabbing) {
                        state.grabFrames++;
                        if (state.grabFrames >= FRAME_HOLD) {
                            const obj = [...state.objects].reverse().find(o =>
                                cx >= o.x && cx <= o.x + o.w &&
                                cy >= o.y && cy <= o.y + o.h
                            );
                            if (obj) {
                                state.isGrabbing = true;
                                state.activeId = obj.id;
                                state.dragOffset = { x: cx - obj.x, y: cy - obj.y };
                                document.getElementById('hud-status').innerText = 'LINKED';
                                document.getElementById('hud-status').style.color = '#4ade80';
                            }
                        }
                    }
                } else if (dist > GRAB_END) {
                    state.grabFrames = 0;
                    if (state.isGrabbing) {
                        state.releaseFrames++;
                        if (state.releaseFrames >= FRAME_HOLD) {
                            const activeObj = state.objects.find(o => o.id === state.activeId);
                            if (activeObj) {
                                const el = document.getElementById(`workspace-obj-${activeObj.id}`);
                                if (el) {
                                    el.style.transform = `translate(${activeObj.x}px, ${activeObj.y}px) scale(1)`;
                                }
                            }
                            state.isGrabbing = false;
                            state.activeId = null;
                            document.getElementById('hud-status').innerText = 'IDLE';
                            document.getElementById('hud-status').style.color = 'rgba(255,255,255,0.4)';
                        }
                    }
                }

                // Hover Detection
                if (!state.isGrabbing) {
                    const obj = [...state.objects].reverse().find(o =>
                        cx >= o.x && cx <= o.x + o.w &&
                        cy >= o.y && cy <= o.y + o.h
                    );
                    const newHoverId = obj ? obj.id : null;
                    if (newHoverId !== state.hoverId) {
                        if (state.hoverId) document.getElementById(`workspace-obj-${state.hoverId}`)?.classList.remove('hovered');
                        state.hoverId = newHoverId;
                        if (newHoverId) document.getElementById(`workspace-obj-${newHoverId}`)?.classList.add('hovered');
                    }
                }

                // Interaction
                if (state.isGrabbing && state.activeId) {
                    const obj = state.objects.find(o => o.id === state.activeId);
                    obj.x = cx - state.dragOffset.x;
                    obj.y = cy - state.dragOffset.y;

                    const el = document.getElementById(`workspace-obj-${obj.id}`);
                    if (el) {
                        el.style.transform = `translate(${obj.x}px, ${obj.y}px) scale(1.05)`;
                        el.style.zIndex = '1000';
                    }
                }

                // HIGHLIGHT HAND FEED AREA
                canvasCtx.save();
                canvasCtx.beginPath();
                // Create a circular gradient centered on the hand for that "glow" effect
                const gradient = canvasCtx.createRadialGradient(cx, cy, 20, cx, cy, 120);
                gradient.addColorStop(0, 'rgba(96, 165, 250, 0.2)');
                gradient.addColorStop(1, 'transparent');
                canvasCtx.fillStyle = gradient;
                canvasCtx.arc(cx, cy, 120, 0, Math.PI * 2);
                canvasCtx.fill();
                canvasCtx.restore();

                // LANDMARKS DRAWING
                canvasCtx.save();
                canvasCtx.translate(W, 0); canvasCtx.scale(-1, 1);
                const connections = window.HAND_CONNECTIONS || (window.Hands && window.Hands.HAND_CONNECTIONS);
                window.drawConnectors?.(canvasCtx, landmarks, connections, { color: 'rgba(255,255,255,0.35)', lineWidth: 2 });
                canvasCtx.restore();

                landmarks.forEach((p, i) => {
                    const px = (1 - p.x) * W; const py = p.y * H;
                    canvasCtx.beginPath();
                    canvasCtx.arc(px, py, (i === 4 || i === 8) ? 6 : 3, 0, Math.PI * 2);
                    canvasCtx.fillStyle = (i === 4 || i === 8) ? '#4ade80' : '#fff';
                    canvasCtx.shadowBlur = 10;
                    canvasCtx.shadowColor = (i === 4 || i === 8) ? '#4ade80' : '#fff';
                    canvasCtx.fill();
                    canvasCtx.shadowBlur = 0;
                });
            }
        });

        const camera = new window.Camera(videoRef.current, {
            onFrame: async () => await hands.send({ image: videoRef.current }),
            width: 1280, height: 720
        });

        camera.start().then(() => setModelLoaded(true));

        return () => {
            hands.close();
            camera.stop();
        };
    }, []);

    return (
        <div ref={containerRef} style={{
            width: '100vw', height: '100vh',
            backgroundColor: '#030712',
            position: 'relative', overflow: 'hidden', fontFamily: '"Outfit", sans-serif'
        }}>
            {/* Dark Depth Layer */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at 50% 50%, #111827 0%, #030712 100%)',
                zIndex: 0
            }} />

            {/* CLEAR VIDEO FEED - Increased Opacity for Visibility */}
            <video ref={videoRef} style={{
                position: 'absolute', width: '100%', height: '100%',
                objectFit: 'cover', transform: 'scaleX(-1)',
                opacity: 0.35, // Increased from 0.1 for high clarity
                zIndex: 5,
                filter: 'brightness(1.1) contrast(1.1)'
            }} />

            {/* HAND OVERLAY - Higher Contrast Canvas */}
            <canvas ref={canvasRef} style={{
                position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
                filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))'
            }} width={1280} height={720} />

            {/* HUD Status */}
            <div style={{
                position: 'absolute', top: '40px', right: '40px', zIndex: 100
            }}>
                <div id="hud-status" style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    letterSpacing: '5px',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '8px 20px',
                    borderRadius: '50px',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>IDLE</div>
            </div>

            {/* Interactive Objects (Logic Unit Removed) */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
                {engine.current.objects.map(obj => (
                    <div
                        key={obj.id}
                        id={`workspace-obj-${obj.id}`}
                        className="interactive-card"
                        style={{
                            position: 'absolute', width: obj.w, height: obj.h,
                            background: obj.bg, transform: `translate(${obj.x}px, ${obj.y}px)`,
                            zIndex: 20, transition: 'scale 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            textAlign: 'center', padding: '20px',
                            ...obj.style
                        }}
                    >
                        <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>{obj.icon}</div>
                        <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', opacity: 0.9 }}>{obj.label}</div>
                    </div>
                ))}
            </div>

            {!modelLoaded && (
                <div style={{
                    position: 'absolute', inset: 0, background: '#030712', zIndex: 2000,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white'
                }}>
                    <div className="workspace-loader" />
                    <p style={{ marginTop: '24px', letterSpacing: '8px', fontWeight: 200, fontSize: '0.8rem' }}>CALIBRATING FEED</p>
                </div>
            )}

            <style>{`
                .interactive-card.hovered {
                    scale: 1.05;
                    box-shadow: 0 0 40px rgba(96, 165, 250, 0.3) !important;
                    border-color: rgba(255,255,255,0.4) !important;
                }
                .workspace-loader {
                    width: 40px; height: 40px; border: 1px solid rgba(255,255,255,0.1);
                    border-top: 2px solid #60a5fa; border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default GestureWorkspace;
