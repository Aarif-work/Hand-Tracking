import React, { useRef, useEffect, useState } from 'react';

const GestureReelsTouchSnap = ({ onNavigate }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const reelsRef = useRef(null);
    const [modelLoaded, setModelLoaded] = useState(false);

    // Physics & Gesture Engine
    const engine = useRef({
        scrollY: 0,
        dragStartY: 0,
        lastY: 0,
        velocity: 0,
        isDragging: false,
        isSnapping: false,
        activeReelIndex: 0,

        // Gesture State
        activeFrames: 0,
        releaseFrames: 0,
        fistBuffer: 0,
        likeBuffer: 0,
        isPaused: false,

        // Buffers & Thresholds
        ACTIVATE_BUF: 3,
        RELEASE_BUF: 3,
        SNAP_THRESHOLD: 0.2, // % of screen height to trigger next/prev reel

        // Visuals
        reelHeight: window.innerHeight,
        likedReels: new Set()
    });

    const [reels, setReels] = useState([
        {
            id: 1,
            user: '@nature_explorer',
            video: 'https://v.ftcdn.net/04/90/19/22/700_F_490192233_l0T1v7nEOnW1z1YqQjK7rB1u6P0Z9z8N_ST.mp4',
            caption: 'The golden hour in the valley is magical. ✨ #nature #reels',
            likes: '1.2M'
        },
        {
            id: 2,
            user: '@city_vibe',
            video: 'https://v.ftcdn.net/06/15/45/61/700_F_615456170_H69fkbTPX47R2x89VlPIdL6SgL5R8p3k_ST.mp4',
            caption: 'Nights in New Tokyo. 🏙️⚡ #cyberpunk #neon',
            likes: '850K'
        },
        {
            id: 3,
            user: '@adventure_life',
            video: 'https://v.ftcdn.net/05/22/01/71/700_F_522017128_XpDR2N8TQXrGvJm4w8SjQY9K6nC1z7fI_ST.mp4',
            caption: 'Pushing limits every day. 🏔️🔥 #climbing #freedom',
            likes: '2.1M'
        }
    ]);

    useEffect(() => {
        if (!window.Hands || !window.Camera) return;

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
            if (!canvasRef.current || !reelsRef.current) return;
            const state = engine.current;
            const canvasCtx = canvasRef.current.getContext('2d');
            const { width: W, height: H } = canvasRef.current;

            canvasCtx.clearRect(0, 0, W, H);

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];
                const indexTip = landmarks[8];
                const thumbTip = landmarks[4];
                const midTip = landmarks[12];
                const ringTip = landmarks[16];
                const pinkyTip = landmarks[20];

                const curY = indexTip.y * H;
                const curX = indexTip.x * W;

                // 1. Gesture Detection: Single Index Finger
                const isIndexOpen = indexTip.y < landmarks[6].y;
                const isMiddleClosed = midTip.y > landmarks[10].y;
                const isRingClosed = ringTip.y > landmarks[14].y;
                const isPinkyClosed = pinkyTip.y > landmarks[18].y;
                const isThumbClosed = Math.abs(thumbTip.x - landmarks[5].x) < 0.1;

                const scrollModePossible = isIndexOpen && isMiddleClosed && isRingClosed && isPinkyClosed && isThumbClosed;

                if (scrollModePossible) {
                    state.activeFrames++;
                    state.releaseFrames = 0;
                } else {
                    state.releaseFrames++;
                    if (state.releaseFrames > state.RELEASE_BUF) {
                        state.activeFrames = 0;
                    }
                }

                const isActive = state.activeFrames > state.ACTIVATE_BUF;

                // 2. Drag Logic
                if (isActive) {
                    if (!state.isDragging) {
                        state.isDragging = true;
                        state.lastY = curY;
                        state.dragStartY = curY;
                        state.isSnapping = false;
                        reelsRef.current.style.transition = 'none'; // Disable transition for raw drag
                    } else {
                        const deltaY = curY - state.lastY;
                        state.scrollY -= deltaY;
                        state.velocity = -deltaY;
                        state.lastY = curY;
                    }
                } else if (state.isDragging) {
                    // Release drag
                    state.isDragging = false;
                    reelsRef.current.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
                    calculateSnap();
                }

                // 3. Fist Gesture (Pause)
                const isFist = dist(indexTip, landmarks[5]) < 0.08 &&
                    dist(midTip, landmarks[9]) < 0.08 &&
                    dist(ringTip, landmarks[13]) < 0.08 &&
                    dist(pinkyTip, landmarks[17]) < 0.08;

                if (isFist) {
                    state.fistBuffer++;
                    if (state.fistBuffer > 5 && !state.isPaused) {
                        state.isPaused = true;
                        toggleVideo(true);
                    }
                } else {
                    state.fistBuffer = 0;
                    if (state.isPaused) {
                        state.isPaused = false;
                        toggleVideo(false);
                    }
                }

                // 4. Like Gesture (Thumb Up)
                const isThumbUp = thumbTip.y < indexTip.y - 0.1 && isMiddleClosed && isRingClosed;
                if (isThumbUp) {
                    state.likeBuffer++;
                    if (state.likeBuffer > 8) {
                        triggerLike();
                        state.likeBuffer = -30; // Cooldown
                    }
                } else {
                    state.likeBuffer = Math.max(0, state.likeBuffer - 1);
                }

                // Visual Feedback
                drawOverlay(canvasCtx, landmarks, W, H, isActive, isFist, isThumbUp);
            } else if (state.isDragging) {
                state.isDragging = false;
                reelsRef.current.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
                calculateSnap();
            }
        });

        const camera = new window.Camera(videoRef.current, {
            onFrame: async () => await hands.send({ image: videoRef.current }),
            width: 1280, height: 720
        });

        camera.start().then(() => setModelLoaded(true));

        // Physics/Animation Loop
        let rafId;
        const animate = () => {
            const state = engine.current;
            if (reelsRef.current) {
                if (!state.isDragging) {
                    // Apply momentum/damping if not dragging or snapping
                    if (!state.isSnapping) {
                        state.scrollY += state.velocity;
                        state.velocity *= 0.92; // Friction

                        if (Math.abs(state.velocity) < 0.5) {
                            state.velocity = 0;
                            calculateSnap();
                        }
                    }
                }

                // Bounds
                const maxScroll = (reels.length - 1) * state.reelHeight;
                if (state.scrollY < 0) state.scrollY = 0;
                if (state.scrollY > maxScroll) state.scrollY = maxScroll;

                // Sync UI
                reelsRef.current.style.transform = `translateY(${-state.scrollY}px)`;

                // Update active reel based on scroll position
                const newIndex = Math.round(state.scrollY / state.reelHeight);
                if (newIndex !== state.activeReelIndex) {
                    state.activeReelIndex = newIndex;
                    updateVideoPlayback();
                }
            }
            rafId = requestAnimationFrame(animate);
        };
        rafId = requestAnimationFrame(animate);

        return () => {
            hands.close();
            camera.stop();
            cancelAnimationFrame(rafId);
        };
    }, [reels]);

    const calculateSnap = () => {
        const state = engine.current;
        const targetIndex = Math.round(state.scrollY / state.reelHeight);
        state.isSnapping = true;
        state.scrollY = targetIndex * state.reelHeight;

        // Re-enable transition for smooth snap
        if (reelsRef.current) {
            reelsRef.current.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
        }

        setTimeout(() => {
            state.isSnapping = false;
        }, 400);
    };

    const toggleVideo = (pause) => {
        const videos = reelsRef.current?.querySelectorAll('video');
        videos?.forEach((v, idx) => {
            if (idx === engine.current.activeReelIndex) {
                if (pause) v.pause();
                else v.play().catch(() => { });
            }
        });
    };

    const updateVideoPlayback = () => {
        const videos = reelsRef.current?.querySelectorAll('video');
        videos?.forEach((v, idx) => {
            if (idx === engine.current.activeReelIndex) {
                v.play().catch(() => { });
            } else {
                v.pause();
                v.currentTime = 0;
            }
        });
    };

    const triggerLike = () => {
        const idx = engine.current.activeReelIndex;
        const reelEl = reelsRef.current?.children[idx];
        if (reelEl) {
            const heart = reelEl.querySelector('.reels-heart-anim');
            heart.classList.add('pop');
            setTimeout(() => heart.classList.remove('pop'), 1000);

            // Set state for persistent like
            setReels(prev => prev.map((r, i) => i === idx ? { ...r, isLiked: true } : r));
        }
    };

    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    const drawOverlay = (ctx, landmarks, W, H, active, fist, like) => {
        ctx.save();
        ctx.translate(W, 0); ctx.scale(-1, 1);

        let color = 'rgba(255,255,255,0.2)';
        if (active) color = '#3b82f6';
        if (fist) color = '#fbbf24';
        if (like) color = '#f43f5e';

        window.drawConnectors?.(ctx, landmarks, window.HAND_CONNECTIONS, { color, lineWidth: 2 });
        landmarks.forEach((p, i) => {
            ctx.beginPath();
            ctx.arc(p.x * W, p.y * H, (i === 8 || i === 4) ? 6 : 3, 0, Math.PI * 2);
            ctx.fillStyle = (i === 8) ? '#3b82f6' : (i === 4 ? '#f43f5e' : '#fff');
            ctx.fill();
        });
        ctx.restore();
    };

    return (
        <div style={{
            width: '100vw', height: '100vh', background: '#000',
            position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif'
        }}>
            {/* Background Camera */}
            <video ref={videoRef} style={{
                position: 'absolute', width: '100%', height: '100%',
                objectFit: 'cover', transform: 'scaleX(-1)', opacity: 0.15,
                zIndex: 0
            }} />
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 100, pointerEvents: 'none' }} width={1280} height={720} />

            {/* Reels Viewport - Aligned Right */}
            <div style={{
                position: 'absolute', top: 0, right: 0, width: '450px', height: '100vh',
                background: '#000', borderLeft: '1px solid #262626', zIndex: 50,
                overflow: 'hidden'
            }}>
                <div ref={reelsRef} style={{ height: '100%', willChange: 'transform' }}>
                    {reels.map((reel, idx) => (
                        <div key={reel.id} style={{
                            height: '100vh', width: '100%', position: 'relative',
                            display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#000'
                        }}>
                            <video
                                src={reel.video}
                                loop
                                muted={idx !== engine.current.activeReelIndex}
                                playsInline
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />

                            {/* Overlay Info */}
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                padding: '20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                color: 'white'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#444' }} />
                                    <span style={{ fontWeight: 'bold' }}>{reel.user}</span>
                                    <button style={{ border: '1px solid white', background: 'transparent', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '12px' }}>Follow</button>
                                </div>
                                <p style={{ fontSize: '14px', margin: 0 }}>{reel.caption}</p>
                            </div>

                            {/* Sidebar Actions */}
                            <div style={{
                                position: 'absolute', right: '10px', bottom: '100px',
                                display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', color: reel.isLiked ? '#ed4956' : 'white' }}>❤️</div>
                                    <div style={{ fontSize: '12px', color: 'white' }}>{reel.likes}</div>
                                </div>
                                <div style={{ fontSize: '24px', color: 'white' }}>💬</div>
                                <div style={{ fontSize: '24px', color: 'white' }}>➡️</div>
                            </div>

                            {/* Big Heart Anim */}
                            <div className="reels-heart-anim">❤️</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Gesture HUD */}
            <div style={{
                position: 'absolute', top: '40px', left: '40px',
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
                padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', zIndex: 200
            }}>
                <div style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '10px' }}>REELS CONTROL</div>
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>☝️ <b>Index Drag:</b> Virtual Touch Scroll</div>
                    <div>🚀 <b>Flick:</b> Smooth Momentum</div>
                    <div>👍 <b>Thumb Up:</b> Like Reel</div>
                    <div>✊ <b>Fist:</b> Pause Video</div>
                </div>
            </div>

            <style>{`
                .reels-heart-anim {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0);
                    font-size: 100px; opacity: 0; pointer-events: none; z-index: 60;
                }
                .reels-heart-anim.pop {
                    animation: pop 0.8s ease-out;
                }
                @keyframes pop {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    30% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
                    100% { transform: translate(-50%, -80%) scale(1); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default GestureReelsTouchSnap;
