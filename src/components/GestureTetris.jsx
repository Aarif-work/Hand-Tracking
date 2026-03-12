import React, { useRef, useEffect, useState } from 'react';

const GestureTetris = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [assembledCount, setAssembledCount] = useState(0);

    // Configuration
    const GRID_SIZE = 50; // each cell is 50×50 px

    const GRAB_START = 0.08;
    const GRAB_END = 0.12;
    const FRAME_HOLD = 2;
    const SMOOTHING = 0.8;

    // Zone anchor (for the perfect 5x5 square assembly zone)
    const ZX = 920;
    const ZY = 180;

    /*
     * PERFECT 5x5 SQUARE PUZZLE:
     * 5 pieces, 5 blocks each = 25 blocks total.
     * Fits perfectly into a 5x5 grid with zero overlaps or gaps.
     */
    const SHAPES = [
        {
            type: 'Corner',
            color: '#f87171', // Red
            blocks: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]],
            accent: '#dc2626',
            x: 100, y: 100,
            targetX: ZX + 0 * GRID_SIZE,
            targetY: ZY + 0 * GRID_SIZE,
        },
        {
            type: 'Square+',
            color: '#60a5fa', // Blue
            blocks: [[0, 0], [1, 0], [0, 1], [1, 1], [1, 2]],
            accent: '#2563eb',
            x: 100, y: 340,
            targetX: ZX + 3 * GRID_SIZE,
            targetY: ZY + 0 * GRID_SIZE,
        },
        {
            type: 'C-Piece',
            color: '#4ade80', // Green
            blocks: [[0, 0], [1, 0], [0, 1], [0, 2], [1, 2]],
            accent: '#16a34a',
            x: 350, y: 100,
            targetX: ZX + 1 * GRID_SIZE,
            targetY: ZY + 1 * GRID_SIZE,
        },
        {
            type: 'Stair',
            color: '#facc15', // Yellow
            blocks: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
            accent: '#ca8a04',
            x: 350, y: 340,
            targetX: ZX + 2 * GRID_SIZE,
            targetY: ZY + 2 * GRID_SIZE,
        },
        {
            type: 'L-Long',
            color: '#c084fc', // Purple
            blocks: [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
            accent: '#7c3aed',
            x: 200, y: 550,
            targetX: ZX + 0 * GRID_SIZE,
            targetY: ZY + 3 * GRID_SIZE,
        },
    ];

    // Compute zone bounding box for drawing exactly a 5x5 square
    const ZONE = {
        x: ZX - 10,
        y: ZY - 10,
        width: GRID_SIZE * 5 + 20,
        height: GRID_SIZE * 5 + 20,
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
    });

    // ── Clash / Explosion Effect ──────────────────────────────────────────────
    const triggerClash = (x, y, color) => {
        const container = containerRef.current;
        if (!container) return;

        // Shockwave ring
        const ring = document.createElement('div');
        ring.className = 'clash-ring';
        ring.style.left = `${x}vw`;   // convert canvas px → vw below
        ring.style.top = `${y}vh`;

        // Because canvas is 1280×720 but viewport may differ, use %
        const cvs = containerRef.current;
        const vw = cvs.clientWidth;
        const vh = cvs.clientHeight;
        const px = (x / 1280) * vw;
        const py = (y / 720) * vh;

        const addEl = (el, offsetY = 0) => {
            el.style.left = `${px}px`;
            el.style.top = `${py + offsetY}px`;
            container.appendChild(el);
        };

        const ringEl = document.createElement('div');
        ringEl.className = 'clash-ring';
        ringEl.style.borderColor = color;
        addEl(ringEl);
        setTimeout(() => ringEl.remove(), 800);

        // Flash
        const flash = document.createElement('div');
        flash.className = 'clash-flash';
        flash.style.background = color;
        container.appendChild(flash);
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
            d.style.width = `${6 + Math.random() * 10}px`;
            d.style.height = `${6 + Math.random() * 10}px`;
            d.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
            addEl(d);
            setTimeout(() => d.remove(), 850);
        }

        // Rays
        for (let i = 0; i < 8; i++) {
            const ray = document.createElement('div');
            ray.className = 'clash-ray';
            ray.style.setProperty('--angle', `${(i / 8) * Math.PI * 2}rad`);
            ray.style.backgroundColor = color;
            addEl(ray);
            setTimeout(() => ray.remove(), 600);
        }

        // Snap text
        const snap = document.createElement('div');
        snap.className = 'clash-snap-text';
        snap.innerText = ['SNAP!', 'LOCKED!', 'FIT!', 'BOOM!'][Math.floor(Math.random() * 4)];
        snap.style.color = color;
        addEl(snap, -40);
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

            // Center of assembled shape (approx)
            const cx = obj.targetX + GRID_SIZE;
            const cy = obj.targetY + GRID_SIZE;
            triggerClash(cx, cy, obj.color);
            setAssembledCount(prev => prev + 1);
            return true;
        }
        return false;
    };

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

            // ── Draw Ghost Slot for each unassembled shape ────────────────────
            state.objects.forEach(obj => {
                if (obj.assembled) return;
                obj.blocks.forEach(([bx, by]) => {
                    const rx = obj.targetX + bx * GRID_SIZE;
                    const ry = obj.targetY + by * GRID_SIZE;
                    ctx.save();
                    ctx.globalAlpha = 0.20;
                    ctx.fillStyle = obj.color;
                    ctx.beginPath();
                    ctx.roundRect(rx + 3, ry + 3, GRID_SIZE - 6, GRID_SIZE - 6, 6);
                    ctx.fill();
                    ctx.globalAlpha = 0.45;
                    ctx.strokeStyle = obj.color;
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([5, 4]);
                    ctx.beginPath();
                    ctx.roundRect(rx + 3, ry + 3, GRID_SIZE - 6, GRID_SIZE - 6, 6);
                    ctx.stroke();
                    ctx.setLineDash([]);
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
                            const obj = [...state.objects].reverse().find(o => {
                                if (o.assembled) return false;
                                return o.blocks.some(([bx, by]) => {
                                    const rx = o.currentX + bx * GRID_SIZE;
                                    const ry = o.currentY + by * GRID_SIZE;
                                    return cx >= rx && cx <= rx + GRID_SIZE && cy >= ry && cy <= ry + GRID_SIZE;
                                });
                            });
                            if (obj) {
                                state.isGrabbing = true;
                                state.activeId = obj.id;
                                state.dragOffset = { x: cx - obj.currentX, y: cy - obj.currentY };
                                document.getElementById('tetris-status').innerText = 'LOCKED';
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
                                if (!snapped) {
                                    const el = document.getElementById(`tetris-shape-${obj.id}`);
                                    if (el) {
                                        el.style.transform = `translate(${obj.currentX}px, ${obj.currentY}px) scale(1)`;
                                        el.style.zIndex = '10';
                                    }
                                }
                            }
                            state.isGrabbing = false;
                            state.activeId = null;
                            document.getElementById('tetris-status').innerText = 'SCANNING';
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

                // Hand skeleton
                ctx.save();
                ctx.translate(W, 0); ctx.scale(-1, 1);
                const connColor = isThumbUp ? '#f43f5e' : isPeace ? '#a855f7' : state.isGrabbing ? '#facc15' : 'rgba(255,255,255,0.2)';
                window.drawConnectors?.(ctx, landmarks, window.HAND_CONNECTIONS, { color: connColor, lineWidth: (isThumbUp || isPeace) ? 3 : 1 });
                ctx.restore();

                landmarks.forEach((p, i) => {
                    const px = (1 - p.x) * W, py = p.y * H;
                    ctx.beginPath();
                    ctx.arc(px, py, (i === 4 || i === 8) ? 6 : 2, 0, Math.PI * 2);
                    ctx.fillStyle = i === 4 ? '#f43f5e' : i === 8 ? '#4ade80' : '#fff';
                    ctx.fill();
                });
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

            {/* Canvas — hand tracking + zone drawing */}
            <canvas ref={canvasRef}
                style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}
                width={1280} height={720} />

            {/* Tetris Pieces Layer */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
                {engine.current.objects.map(shape => (
                    <div
                        key={shape.id}
                        id={`tetris-shape-${shape.id}`}
                        style={{
                            position: 'absolute',
                            transform: `translate(${shape.currentX}px, ${shape.currentY}px)`,
                            pointerEvents: 'none',
                            transition: 'filter 0.4s'
                        }}
                    >
                        {shape.blocks.map(([bx, by], idx) => (
                            <div key={idx} className="tetris-block" style={{
                                position: 'absolute',
                                width: GRID_SIZE - 2,
                                height: GRID_SIZE - 2,
                                left: bx * GRID_SIZE,
                                top: by * GRID_SIZE,
                                backgroundColor: shape.color,
                                borderRadius: shape.type === 'O' ? '6px' : '8px',  // square = slightly less rounded for crisper look
                                boxSizing: 'border-box',
                                border: `2px solid ${shape.accent}`,
                                boxShadow: `inset 4px 4px 0 rgba(255,255,255,0.4), inset -4px -4px 0 rgba(0,0,0,0.12)`,
                            }} />
                        ))}

                        {/* Label badge */}
                        <div style={{
                            position: 'absolute',
                            bottom: '-24px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '2px',
                            color: shape.color,
                            textShadow: `0 0 10px ${shape.color}`,
                            whiteSpace: 'nowrap',
                        }}>
                            {shape.type === 'Corner' ? '▛ CORNER'
                                : shape.type === 'Square+' ? '▰ SQUARE+'
                                    : shape.type === 'C-Piece' ? '⊏ C-PIECE'
                                        : shape.type === 'Stair' ? '▞ STAIR'
                                            : '▟ L-LONG'}
                        </div>
                    </div>
                ))}
            </div>

            {/* HUD */}
            <div style={{
                position: 'absolute', top: '20px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(14px)',
                padding: '10px 32px',
                borderRadius: '50px',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'white', zIndex: 100,
                display: 'flex', gap: '24px', alignItems: 'center'
            }}>
                <span id="tetris-status" style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '4px' }}>SCANNING</span>
                <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.2)' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '2px', color: '#facc15' }}>
                    ASSEMBLED: {assembledCount}/{totalPieces}
                </span>
            </div>

            {/* All-assembled trophy */}
            {assembledCount === totalPieces && (
                <div className="all-assembled-banner">🏆 PUZZLE COMPLETE!</div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');

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
