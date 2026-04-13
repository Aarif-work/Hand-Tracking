import React, { useRef, useEffect, useState } from 'react';

const GestureTetris = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [scale, setScale] = useState(1);
    const [assembledCount, setAssembledCount] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [gameComplete, setGameComplete] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const startTimeRef = useRef(null);
    const timerRef = useRef(null);

    const isMobile = window.innerWidth <= 768;

    // On portrait phones, cover-scaling a 1280x720 canvas means only the CENTER
    // ~330px (X: ~474-806) of the canvas is visible. All pieces + zone must live there.
    // GRID_SIZE = 60 → zone = 5×60 = 300px → fits within 332px visible width.
    const GRID_SIZE = isMobile ? 60 : 50;
    const GRAB_START = 0.08;
    const GRAB_END = 0.12;
    const FRAME_HOLD = 2;
    const SMOOTHING = 0.8;

    // Zone anchor — centered horizontally: 640-150=490, vertically: 360-150=210
    const ZX = isMobile ? 490 : 920;
    const ZY = isMobile ? 210 : 180;

    // Mobile piece start positions within visible X range (490-790)
    // Pieces appear above (y~40) or below (y~580) the zone (zone y: 210-510)
    const SHAPES = [
        {
            type: 'Corner',
            color: '#ff5a5f',
            blocks: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]],
            accent: '#d94a4e',
            x: isMobile ? 530 : 100, y: isMobile ? 40 : 100,
            targetX: ZX + 0 * GRID_SIZE,
            targetY: ZY + 0 * GRID_SIZE,
        },
        {
            type: 'Square+',
            color: '#3b82f6',
            blocks: [[0, 0], [1, 0], [0, 1], [1, 1], [1, 2]],
            accent: '#1e40af',
            x: isMobile ? 680 : 100, y: isMobile ? 40 : 340,
            targetX: ZX + 3 * GRID_SIZE,
            targetY: ZY + 0 * GRID_SIZE,
        },
        {
            type: 'C-Piece',
            color: '#10b981',
            blocks: [[0, 0], [1, 0], [0, 1], [0, 2], [1, 2]],
            accent: '#065f46',
            x: isMobile ? 530 : 350, y: isMobile ? 570 : 100,
            targetX: ZX + 1 * GRID_SIZE,
            targetY: ZY + 1 * GRID_SIZE,
        },
        {
            type: 'Stair',
            color: '#f59e0b',
            blocks: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
            accent: '#92400e',
            x: isMobile ? 680 : 350, y: isMobile ? 570 : 340,
            targetX: ZX + 2 * GRID_SIZE,
            targetY: ZY + 2 * GRID_SIZE,
        },
        {
            type: 'L-Long',
            color: '#8b5cf6',
            blocks: [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
            accent: '#5b21b6',
            x: isMobile ? 590 : 200, y: isMobile ? 620 : 550,
            targetX: ZX + 0 * GRID_SIZE,
            targetY: ZY + 3 * GRID_SIZE,
        },
    ];

    const ZONE = {
        x: ZX - 5,
        y: ZY - 5,
        width: GRID_SIZE * 5 + 10,
        height: GRID_SIZE * 5 + 10,
    };

    // Engine State
    const engine = useRef({
        objects: SHAPES.map((s, i) => ({ ...s, id: i + 1, currentX: s.x, currentY: s.y, assembled: false })),
        activeId: null,
        dragOffset: { x: 0, y: 0 },
        grabFrames: 0,
        releaseFrames: 0,
        isGrabbing: false,
        cursor: { x: 0, y: 0 },
        currentIndex: 0 // mirrored from React state for use inside onResults
    });



    // ── Clash / Explosion Effect ──────────────────────────────────────────────
    const triggerClash = (x, y, color) => {
        const board = document.getElementById('game-scaling-layer');
        if (!board) return;

        const addEl = (el, offsetY = 0) => {
            el.style.left = `${x}px`;
            el.style.top = `${y + offsetY}px`;
            el.style.position = 'absolute';
            board.appendChild(el);
        };

        const ringEl = document.createElement('div');
        ringEl.className = 'clash-ring';
        ringEl.style.borderColor = color;
        addEl(ringEl);
        setTimeout(() => ringEl.remove(), 800);

        // Flash (Still full screen)
        const flash = document.createElement('div');
        flash.className = 'clash-flash';
        flash.style.background = color;
        containerRef.current.appendChild(flash);
        setTimeout(() => flash.remove(), 300);

        // Debris
        for (let i = 0; i < 28; i++) {
            const d = document.createElement('div');
            d.className = 'clash-debris';
            const angle = (i / 28) * Math.PI * 2;
            const speed = 70 + Math.random() * 90;
            d.style.setProperty('--dx', `${Math.cos(angle) * speed}px`);
            d.style.setProperty('--dy', `${Math.sin(angle) * speed}px`);
            d.style.backgroundColor = color;
            d.style.width = `${8 + Math.random() * 12}px`;
            d.style.height = `${8 + Math.random() * 12}px`;
            d.style.borderRadius = Math.random() > 0.5 ? '50%' : '4px';
            addEl(d);
            setTimeout(() => d.remove(), 850);
        }

        // Snap text
        const snap = document.createElement('div');
        snap.className = 'clash-snap-text';
        snap.innerText = ['SNAP!', 'LOCKED!', 'FIT!', 'BOOM!'][Math.floor(Math.random() * 4)];
        snap.style.color = color;
        addEl(snap, -60);
        setTimeout(() => snap.remove(), 1000);
    };


    // ── Assembly Snap Check ───────────────────────────────────────────────────
    const checkAssembly = (obj) => {
        const SNAP = GRID_SIZE * 1.4; // generous snap radius
        const dx = Math.abs(obj.currentX - obj.targetX);
        const dy = Math.abs(obj.currentY - obj.targetY);
        if (dx < SNAP && dy < SNAP && !obj.assembled) {
            obj.currentX = obj.targetX;
            obj.currentY = obj.targetY;
            obj.assembled = true;

            const el = document.getElementById(`tetris-shape-${obj.id}`);
            if (el) {
                el.style.transform = `translate(${obj.currentX}px, ${obj.currentY}px) scale(1)`;
                el.style.filter = `drop-shadow(0 0 14px ${obj.color})`;
                el.classList.add('assembled-shape');
            }

            const cx = obj.targetX + GRID_SIZE;
            const cy = obj.targetY + GRID_SIZE;
            triggerClash(cx, cy, obj.color);
            const newCount = engine.current.objects.filter(o => o.assembled).length;
            setAssembledCount(newCount);

            // Check win condition
            if (newCount === engine.current.objects.length) {
                const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
                clearInterval(timerRef.current);
                setElapsedTime(elapsed);
                setTimeout(() => setGameComplete(true), 600); // slight delay for last clash effect
            }
            return true;
        }
        return false;
    };

    // ── Auto-start Timer on Load ──────────────────────────────────────────────
    useEffect(() => {
        if (modelLoaded && !startTimeRef.current) {
            startTimeRef.current = Date.now();
            setGameStarted(true);
        }
    }, [modelLoaded]);

    // Hand grip & tracking logic remains in engine.current and directs DOM updates.
    // We moved the ticking timer to a component to prevent re-renders that break drags.


    // Hand grip & tracking logic remains in engine.current and directs DOM updates.
    // We removed the ticking currentTime state here to prevent re-renders.

    // ── MediaPipe Hands ───────────────────────────────────────────────────────

    useEffect(() => {
        if (!window.Hands || !window.Camera) return;

        const hands = new window.Hands({
            locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
        });
        hands.setOptions({
            maxNumHands: 1, modelComplexity: 1,
            minDetectionConfidence: 0.8, minTrackingConfidence: 0.8
        });

        hands.onResults(results => {
            if (!canvasRef.current) return;
            const state = engine.current;
            const ctx = canvasRef.current.getContext('2d');
            const { width: W, height: H } = canvasRef.current;

            ctx.clearRect(0, 0, W, H);

            // ── Draw Assembly Zone ────────────────────────────────────────────
            ctx.save();
            // Outer glow border
            ctx.shadowColor = 'rgba(255,255,255,0.15)';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([12, 8]);
            ctx.strokeRect(ZONE.x, ZONE.y, ZONE.width, ZONE.height);
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;

            // Label
            ctx.font = 'bold 11px Outfit, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.textAlign = 'center';
            ctx.letterSpacing = '3px';
            ctx.fillText('ASSEMBLY ZONE', ZONE.x + ZONE.width / 2, ZONE.y - 8);
            ctx.restore();

            // ── Draw Ghost Slot ────────────────────
            state.objects.forEach((obj, idx) => {
                if (obj.assembled) return;
                // On mobile, only show the CURRENT target. On desktop, show all.
                if (isMobile && idx !== state.currentIndex) return;

                obj.blocks.forEach(([bx, by]) => {
                    const rx = obj.targetX + bx * GRID_SIZE;
                    const ry = obj.targetY + by * GRID_SIZE;
                    ctx.save();
                    ctx.globalAlpha = 0.25;
                    ctx.fillStyle = obj.color;
                    ctx.beginPath();
                    ctx.roundRect(rx + 3, ry + 3, GRID_SIZE - 6, GRID_SIZE - 6, 8);
                    ctx.fill();
                    ctx.strokeStyle = obj.color;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.stroke();
                    ctx.restore();
                });
            });

            // ── Hand Tracking ─────────────────────────────────────────────────
            if (results.multiHandLandmarks?.length > 0) {
                const landmarks = results.multiHandLandmarks[0];
                const thumb = landmarks[4];
                const index = landmarks[8];

                const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
                const targetX = (1 - index.x) * W;
                const targetY = index.y * H;

                state.cursor.x += (targetX - state.cursor.x) * (1 - SMOOTHING);
                state.cursor.y += (targetY - state.cursor.y) * (1 - SMOOTHING);
                const { x: cx, y: cy } = state.cursor;

                // Pinch grab
                if (dist < GRAB_START) {
                    state.releaseFrames = 0;
                    if (!state.isGrabbing) {
                        state.grabFrames++;
                        if (state.grabFrames >= FRAME_HOLD) {
                            let obj;
                            if (isMobile) {
                                const target = state.objects[state.currentIndex];
                                if (target && !target.assembled) {
                                    const isOver = target.blocks.some(([bx, by]) => {
                                        const rx = target.currentX + bx * GRID_SIZE;
                                        const ry = target.currentY + by * GRID_SIZE;
                                        return cx >= rx && cx <= rx + GRID_SIZE && cy >= ry && cy <= ry + GRID_SIZE;
                                    });
                                    if (isOver) obj = target;
                                }
                            } else {
                                obj = [...state.objects].reverse().find(o => {
                                    if (o.assembled) return false;
                                    return o.blocks.some(([bx, by]) => {
                                        const rx = o.currentX + bx * GRID_SIZE;
                                        const ry = o.currentY + by * GRID_SIZE;
                                        return cx >= rx && cx <= rx + GRID_SIZE && cy >= ry && cy <= ry + GRID_SIZE;
                                    });
                                });
                            }

                            if (obj) {
                                // Start timer on first grab
                                if (!startTimeRef.current) {
                                    startTimeRef.current = Date.now();
                                    setGameStarted(true);
                                }
                                state.isGrabbing = true;
                                state.activeId = obj.id;
                                state.dragOffset = { x: cx - obj.currentX, y: cy - obj.currentY };
                            }
                        }
                    }
                } else if (dist > GRAB_END) {
                    state.grabFrames = 0;
                    if (state.isGrabbing) {
                        state.releaseFrames++;
                        if (state.releaseFrames >= FRAME_HOLD) {
                            const obj = state.objects.find(o => o.id === state.activeId);
                            if (obj) {
                                obj.currentX = Math.round(obj.currentX / GRID_SIZE) * GRID_SIZE;
                                obj.currentY = Math.round(obj.currentY / GRID_SIZE) * GRID_SIZE;
                                const snapped = checkAssembly(obj);
                                if (snapped && isMobile) {
                                    engine.current.currentIndex++;
                                    setCurrentIndex(engine.current.currentIndex); // trigger re-render
                                } else if (!snapped) {
                                    const el = document.getElementById(`tetris-shape-${obj.id}`);
                                    if (el) {
                                        el.style.transform = `translate(${obj.currentX}px, ${obj.currentY}px) scale(1)`;
                                        el.style.zIndex = '10';
                                    }
                                }
                            }
                            state.isGrabbing = false;
                            state.activeId = null;
                            state.grabFrames = 0;
                            state.releaseFrames = 0;
                        }
                    }
                }

                // Drag
                if (state.isGrabbing && state.activeId) {
                    const obj = state.objects.find(o => o.id === state.activeId);
                    obj.currentX = cx - state.dragOffset.x;
                    obj.currentY = cy - state.dragOffset.y;
                    const el = document.getElementById(`tetris-shape-${obj.id}`);
                    if (el) {
                        el.style.transform = `translate(${obj.currentX}px, ${obj.currentY}px) scale(1.06)`;
                        el.style.zIndex = '1000';
                    }
                }

                // Celebrations
                const isThumbUp = landmarks[4].y < landmarks[3].y &&
                    landmarks[8].y > landmarks[6].y && landmarks[12].y > landmarks[10].y &&
                    landmarks[16].y > landmarks[14].y && landmarks[20].y > landmarks[18].y;
                const isPeace = landmarks[8].y < landmarks[6].y && landmarks[12].y < landmarks[10].y &&
                    landmarks[16].y > landmarks[14].y && landmarks[20].y > landmarks[18].y;

                if (isThumbUp) {
                    state.likeBuffer = (state.likeBuffer || 0) + 1;
                    if (state.likeBuffer > 10) { triggerCelebration('👍'); state.likeBuffer = -50; }
                } else if (isPeace) {
                    state.peaceBuffer = (state.peaceBuffer || 0) + 1;
                    if (state.peaceBuffer > 10) { triggerCelebration('✌️'); state.peaceBuffer = -50; }
                } else {
                    state.likeBuffer = Math.max(0, (state.likeBuffer || 0) - 1);
                    state.peaceBuffer = Math.max(0, (state.peaceBuffer || 0) - 1);
                }

                // Cursor glow
                ctx.save();
                const grd = ctx.createRadialGradient(cx, cy, 10, cx, cy, 90);
                let gc = state.isGrabbing ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.12)';
                if (isThumbUp) gc = 'rgba(244,63,94,0.3)';
                else if (isPeace) gc = 'rgba(168,85,247,0.3)';
                grd.addColorStop(0, gc);
                grd.addColorStop(1, 'transparent');
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(cx, cy, 90, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Hand skeleton & Landmarks
                ctx.save();
                ctx.translate(W, 0); ctx.scale(-1, 1);
                // Bold connectors
                window.drawConnectors?.(ctx, landmarks, window.HAND_CONNECTIONS, { color: 'rgba(255,255,255,0.6)', lineWidth: 5 });
                // High-visibility 21 points
                window.drawLandmarks?.(ctx, landmarks, {
                    color: state.isGrabbing ? '#ffb400' : '#4ade80',
                    lineWidth: 2,
                    radius: (i) => (i === 4 || i === 8) ? 8 : 4
                });
                ctx.restore();
            }
        });

        const camera = new window.Camera(videoRef.current, {
            onFrame: async () => await hands.send({ image: videoRef.current }),
            width: 1280, height: 720
        });
        camera.start().then(() => setModelLoaded(true));
        return () => { hands.close(); camera.stop(); };
    }, []);

    // ── Celebration effect ────────────────────────────────────────────────────
    const triggerCelebration = (emoji) => {
        const c = containerRef.current;
        if (!c) return;
        const el = document.createElement('div');
        el.className = 'celebration-emoji';
        el.innerHTML = emoji;
        el.style.left = '50%'; el.style.top = '50%';
        c.appendChild(el);
        for (let i = 0; i < 30; i++) {
            const s = document.createElement('div');
            s.className = 'cracker-sparkle';
            const a = Math.random() * Math.PI * 2;
            const v = 5 + Math.random() * 10;
            s.style.left = '50%'; s.style.top = '50%';
            s.style.setProperty('--vx', `${Math.cos(a) * v * 20}px`);
            s.style.setProperty('--vy', `${Math.sin(a) * v * 20}px`);
            s.style.backgroundColor = emoji === '✌️'
                ? `hsl(${270 + Math.random() * 40},100%,60%)`
                : `hsl(${Math.random() * 360},100%,50%)`;
            c.appendChild(s);
            setTimeout(() => s.remove(), 1000);
        }
        setTimeout(() => el.remove(), 2000);
    };

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const ratio = isMobile
                ? Math.max(width / 1280, height / 720)
                : Math.min(width / 1280, height / 720);
            setScale(ratio);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const totalPieces = engine.current.objects.length;

    return (
        <div ref={containerRef} style={{
            width: '100vw', height: '100vh',
            background: '#000',
            position: 'relative', overflow: 'hidden',
            fontFamily: '"Outfit", sans-serif'
        }}>
            {/* Camera feed */}
            <video ref={videoRef} style={{
                position: 'absolute', width: '100%', height: '100%',
                objectFit: 'cover', transform: 'scaleX(-1)', opacity: 0.8, zIndex: 0
            }} />

            {/* Scaling Layer for Game Board */}
            <div id="game-scaling-layer" style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '1280px',
                height: '720px',
                transform: `translate(-50%, -50%) scale(${scale})`,
                zIndex: 10,
                pointerEvents: 'none'
            }}>
                {/* Canvas — hand tracking + zone drawing */}
                <canvas ref={canvasRef}
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                    width={1280} height={720} />

                {/* Tetris Pieces Layer */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {engine.current.objects.map((shape, idx) => {
                        // Mobile: only show assembled pieces + current active piece
                        if (isMobile && idx > currentIndex && !shape.assembled) return null;

                        return (
                            <div
                                key={shape.id}
                                id={`tetris-shape-${shape.id}`}
                                style={{
                                    position: 'absolute',
                                    transform: `translate(${shape.currentX}px, ${shape.currentY}px)`,
                                    pointerEvents: 'none',
                                    transition: 'filter 0.4s',
                                }}
                            >
                                {shape.blocks.map(([bx, by], bIdx) => (
                                    <div key={bIdx} className="tetris-block" style={{
                                        position: 'absolute',
                                        width: GRID_SIZE - 2,
                                        height: GRID_SIZE - 2,
                                        left: bx * GRID_SIZE,
                                        top: by * GRID_SIZE,
                                        backgroundColor: shape.color,
                                        borderRadius: shape.type === 'O' ? '6px' : '10px',
                                        boxSizing: 'border-box',
                                        border: `${isMobile ? 3 : 2}px solid ${shape.accent}`,
                                        boxShadow: `inset 4px 4px 0 rgba(255,255,255,0.4), inset -4px -4px 0 rgba(0,0,0,0.15)`,
                                    }} />
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* HUD (Simplified) */}
            <div style={{
                position: 'absolute', top: '20px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(14px)',
                padding: '8px 24px',
                borderRadius: '50px',
                border: '1px solid rgba(0,0,0,0.1)',
                color: '#000', zIndex: 100,
                display: 'flex', gap: '16px', alignItems: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '1px' }}>
                    ASSEMBLED: <span style={{ color: 'var(--primary)' }}>{assembledCount}/{totalPieces}</span>
                </span>
            </div>

            {/* Live Timer (Top Right) */}
            {gameStarted && (
                <LiveTimer startTimeRef={startTimeRef} gameComplete={gameComplete} />
            )}

            {/* ── GAME COMPLETE POPUP ──────────────────────────────────── */}
            {gameComplete && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(8px)',
                    animation: 'fadeInOverlay 0.4s ease'
                }}>
                    {/* Confetti particles */}
                    {Array.from({ length: 60 }).map((_, i) => {
                        const colors = ['#ff5a5f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#facc15', '#f43f5e', '#06b6d4'];
                        const color = colors[i % colors.length];
                        const left = `${Math.random() * 100}%`;
                        const delay = `${Math.random() * 2}s`;
                        const duration = `${2 + Math.random() * 2}s`;
                        const size = `${6 + Math.random() * 10}px`;
                        const shape = Math.random() > 0.5 ? '50%' : '2px';
                        return (
                            <div key={i} style={{
                                position: 'absolute',
                                top: '-20px',
                                left,
                                width: size,
                                height: size,
                                borderRadius: shape,
                                backgroundColor: color,
                                animation: `confettiFall ${duration} ${delay} ease-in forwards`,
                                zIndex: 10000
                            }} />
                        );
                    })}

                    {/* Popup Card */}
                    <div style={{
                        background: 'white',
                        borderRadius: '28px',
                        padding: '2.5rem 2rem',
                        textAlign: 'center',
                        maxWidth: '340px',
                        width: '90vw',
                        boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
                        position: 'relative',
                        animation: 'popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)',
                        zIndex: 10001
                    }}>
                        <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🏆</div>
                        <h2 style={{
                            fontSize: '1.8rem',
                            fontWeight: 900,
                            background: 'linear-gradient(135deg, #ff5a5f, #f59e0b)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: '0.5rem',
                            lineHeight: 1.2
                        }}>
                            Puzzle Complete!
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '1.5rem' }}>
                            You assembled all 5 pieces
                        </p>

                        {/* Time display */}
                        <div style={{
                            background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                            border: '2px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '1rem 1.5rem',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '2px', marginBottom: '0.25rem' }}>
                                YOUR TIME
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1e293b', lineHeight: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                                {Math.floor(elapsedTime / 60)}<span style={{ fontSize: '1.2rem', color: '#ff5a5f', fontWeight: 700, marginRight: '8px' }}>m</span>
                                {(elapsedTime % 60)}<span style={{ fontSize: '1.2rem', color: '#ff5a5f', fontWeight: 700 }}>s</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                {elapsedTime < 30 ? '⚡ Lightning Fast!' : elapsedTime < 60 ? '🔥 Impressive!' : elapsedTime < 120 ? '✨ Great Job!' : '💪 Well Done!'}
                            </div>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: 'linear-gradient(135deg, #ff5a5f, #f59e0b)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '14px',
                                fontSize: '1rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                letterSpacing: '0.5px',
                                boxShadow: '0 6px 20px rgba(255,90,95,0.4)'
                            }}
                        >
                            🔄 Play Again
                        </button>
                    </div>
                </div>
            )}


            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');

                @keyframes confettiFall {
                    0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
                    80%  { opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                }

                @keyframes fadeInOverlay {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }

                @keyframes timerBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; transform: scale(1.02); }
                }

                @keyframes popIn {
                    0%   { transform: scale(0.5); opacity: 0; }
                    80%  { transform: scale(1.05); }
                    100% { transform: scale(1); opacity: 1; }
                }

                .tetris-block::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    border: 1px solid rgba(255,255,255,0.25);
                }

                .assembled-shape {
                    animation: assemblePulse 0.55s cubic-bezier(0.175,0.885,0.32,1.275);
                }
                @keyframes assemblePulse {
                    0%   { transform: scale(1.18); }
                    45%  { transform: scale(0.92); }
                    72%  { transform: scale(1.06); }
                    100% { transform: scale(1); }
                }

                /* ── CLASH EFFECT ───────────────────── */
                .clash-ring {
                    position: absolute;
                    width: 8px; height: 8px;
                    border-radius: 50%;
                    border-width: 3px;
                    border-style: solid;
                    transform: translate(-50%,-50%);
                    animation: clashRing 0.7s ease-out forwards;
                    z-index: 500;
                    pointer-events: none;
                    box-shadow: 0 0 12px currentColor;
                }
                @keyframes clashRing {
                    0%   { width:8px;   height:8px;   opacity:1; }
                    100% { width:280px; height:280px; opacity:0; }
                }

                .clash-flash {
                    position: absolute; inset: 0;
                    animation: clashFlash 0.28s ease-out forwards;
                    z-index: 400; pointer-events: none;
                }
                @keyframes clashFlash {
                    0%   { opacity:0.18; }
                    100% { opacity:0; }
                }

                .clash-debris {
                    position: absolute;
                    transform: translate(-50%,-50%);
                    animation: clashDebris 0.8s cubic-bezier(0.22,0.61,0.36,1) forwards;
                    z-index: 502; pointer-events: none;
                }
                @keyframes clashDebris {
                    0%   { transform: translate(-50%,-50%) scale(1); opacity:1; }
                    100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.05); opacity:0; }
                }

                .clash-ray {
                    position: absolute;
                    width: 4px; height: 55px;
                    transform-origin: top center;
                    transform: translate(-50%,0) rotate(var(--angle));
                    animation: clashRay 0.55s ease-out forwards;
                    z-index: 501; pointer-events: none;
                    border-radius: 2px;
                }
                @keyframes clashRay {
                    0%   { height:15px; opacity:1; }
                    100% { height:85px; opacity:0; }
                }

                .clash-snap-text {
                    position: absolute;
                    transform: translate(-50%,-50%);
                    font-family:'Outfit',sans-serif;
                    font-size: 26px;
                    font-weight: 900;
                    letter-spacing: 2px;
                    text-shadow: 0 0 18px currentColor;
                    animation: snapTextPop 0.9s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
                    z-index: 503; pointer-events: none;
                }
                @keyframes snapTextPop {
                    0%   { transform:translate(-50%,-50%) scale(0.2); opacity:0; }
                    30%  { transform:translate(-50%,-65%) scale(1.3); opacity:1; }
                    70%  { transform:translate(-50%,-85%) scale(1);   opacity:1; }
                    100% { transform:translate(-50%,-130%) scale(0.8); opacity:0; }
                }

                /* ── CELEBRATIONS ───────────────────── */
                .celebration-emoji {
                    position: absolute;
                    font-size: 110px;
                    transform: translate(-50%,-50%);
                    animation: emojiPop 2s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
                    z-index: 1001;
                }
                @keyframes emojiPop {
                    0%   { transform:translate(-50%,-50%) scale(0) rotate(-20deg); opacity:0; }
                    20%  { transform:translate(-50%,-50%) scale(1.5) rotate(10deg); opacity:1; }
                    50%  { transform:translate(-50%,-60%) scale(1.2); opacity:1; }
                    100% { transform:translate(-50%,-150%) scale(1); opacity:0; }
                }

                .cracker-sparkle {
                    position: absolute;
                    width:8px; height:8px;
                    border-radius:50%;
                    transform:translate(-50%,-50%);
                    animation: sparkleExplode 1s ease-out forwards;
                    z-index:1000;
                }
                @keyframes sparkleExplode {
                    0%   { transform:translate(-50%,-50%) scale(1); opacity:1; }
                    100% { transform:translate(calc(-50% + var(--vx)), calc(-50% + var(--vy))) scale(0); opacity:0; }
                }

                /* ── ALL ASSEMBLED ───────────────────── */
                .all-assembled-banner {
                    position: absolute;
                    top:50%; left:50%;
                    transform: translate(-50%,-50%);
                    background: linear-gradient(135deg,#facc15,#f97316,#ec4899);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-size: 54px;
                    font-weight: 900;
                    letter-spacing: 3px;
                    text-align: center;
                    animation: bannerPop 1.2s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
                    z-index: 600;
                    pointer-events: none;
                    filter: drop-shadow(0 0 30px rgba(250,204,21,0.6));
                }
                @keyframes bannerPop {
                    0%   { transform:translate(-50%,-50%) scale(0); opacity:0; }
                    60%  { transform:translate(-50%,-50%) scale(1.1); opacity:1; }
                    100% { transform:translate(-50%,-50%) scale(1); opacity:1; }
                }
            `}</style>
        </div>
    );
};

export default GestureTetris;

const LiveTimer = ({ startTimeRef, gameComplete }) => {
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        let interval;
        if (startTimeRef.current && !gameComplete) {
            const update = () => {
                setCurrentTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
            };
            update();
            interval = setInterval(update, 1000);
        }
        return () => clearInterval(interval);
    }, [gameComplete]);

    return (
        <div style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(14px)',
            padding: '8px 20px',
            borderRadius: '50px',
            border: '1px solid rgba(0,0,0,0.1)',
            color: '#000', zIndex: 100,
            display: 'flex', gap: '8px', alignItems: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            animation: !gameComplete ? 'timerBlink 1s infinite' : 'none'
        }}>
            <span style={{ fontSize: '1rem' }}>⏱️</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'monospace' }}>
                {Math.floor(currentTime / 60).toString().padStart(2, '0')}:
                {(currentTime % 60).toString().padStart(2, '0')}
            </span>
        </div>
    );
};
