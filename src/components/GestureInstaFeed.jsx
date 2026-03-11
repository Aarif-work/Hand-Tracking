import React, { useRef, useEffect, useState } from 'react';

const GestureInstaFeed = ({ onNavigate }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [modelLoaded, setModelLoaded] = useState(false);

    // Performance & Gesture State (Refs to avoid re-renders)
    const engine = useRef({
        scrollPos: 0,
        scrollVelocity: 0,
        lastIndexY: null,
        lastIndexX: null,
        isSwipingY: false,
        isSwipingX: false,

        // Gesture Confirmation Buffers
        likeBuffer: 0,
        fistBuffer: 0,
        swipeXBuffer: { direction: null, count: 0 },

        // Settings
        friction: 0.95,
        gestureSensitivity: 1.5,
        smoothing: 0.75,

        // Interaction Flags
        lastLikeTime: 0,
        isPaused: false,
        likedPosts: new Set()
    });

    const [posts, setPosts] = useState([
        {
            id: 1,
            user: 'mountain_man',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
            likes: 1243,
            caption: 'The view from the top is always worth the climb. 🏔️ #trekking #summit'
        },
        {
            id: 2,
            user: 'urban_sketches',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
            likes: 852,
            caption: 'Metropolis rhythm. 🏙️ #citylife #architecture'
        },
        {
            id: 3,
            user: 'neon_dreamer',
            avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop',
            type: 'video',
            url: 'https://v.ftcdn.net/06/15/45/61/700_F_615456170_H69fkbTPX47R2x89VlPIdL6SgL5R8p3k_ST.mp4',
            likes: 2105,
            caption: 'Cyberpunk nights. ⚡ #neon #future'
        },
        {
            id: 4,
            user: 'nature_vibe',
            avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
            likes: 5634,
            caption: 'Breathe in the forest air. 🌲 #nature #forest'
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
            if (!canvasRef.current) return;
            const state = engine.current;
            const canvasCtx = canvasRef.current.getContext('2d');
            const { width: W, height: H } = canvasRef.current;

            canvasCtx.clearRect(0, 0, W, H);

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];

                // --- GESTURE COORDINATES ---
                const indexTip = landmarks[8];
                const thumbTip = landmarks[4];
                const midTip = landmarks[12];
                const ringTip = landmarks[16];
                const pinkyTip = landmarks[20];
                const wrist = landmarks[0];

                const curX = indexTip.x * W;
                const curY = indexTip.y * H;

                // --- 1. SINGLE FINGER SCROLL LOGIC ---
                // Detect individual finger states for intent-based scrolling
                const isIndexOpen = indexTip.y < landmarks[6].y; // Tip below PIP
                const isMiddleClosed = midTip.y > landmarks[10].y;
                const isRingClosed = ringTip.y > landmarks[14].y;
                const isPinkyClosed = pinkyTip.y > landmarks[18].y;

                // Thumb is "closed" if it's relatively close to the palm horizontally
                const isThumbClosed = Math.abs(thumbTip.x - landmarks[5].x) < 0.1;

                const singleFingerMode = isIndexOpen && isMiddleClosed && isRingClosed && isPinkyClosed && isThumbClosed;

                if (singleFingerMode) {
                    state.activeFrames = (state.activeFrames || 0) + 1;
                } else {
                    state.activeFrames = 0;
                }

                const SCROLL_ACTIVATE_FRAMES = 3;
                const scrollMode = state.activeFrames > SCROLL_ACTIVATE_FRAMES;

                // Track movement delta
                if (state.lastIndexY !== null) {
                    const deltaY = (curY - state.lastIndexY);
                    const MOVE_THRESHOLD = 5; // Pixels

                    if (state.scrollCooldown > 0) {
                        state.scrollCooldown--;
                    }

                    if (scrollMode && Math.abs(deltaY) > MOVE_THRESHOLD && (state.scrollCooldown || 0) === 0) {
                        state.scrollVelocity += deltaY * 1.5;
                        state.scrollCooldown = 3; // Small cooldown to prevent jitter
                    }
                }
                state.lastIndexY = curY;

                // --- 2. NAVIGATION (Index Finger Horizontal Delta) ---
                if (state.lastIndexX !== null) {
                    const deltaX = (curX - state.lastIndexX);
                    // Navigation also requires single finger mode for stability
                    if (scrollMode && Math.abs(deltaX) > 80) { // Larger swipe for navigation
                        const dir = deltaX > 0 ? 'right' : 'left';
                        if (state.swipeXBuffer.direction === dir) {
                            state.swipeXBuffer.count++;
                            if (state.swipeXBuffer.count > 5) {
                                if (dir === 'left') onNavigate('prev');
                                else onNavigate('next');
                                state.swipeXBuffer.count = 0;
                                state.activeFrames = 0; // Prevent scrolling during nav
                            }
                        } else {
                            state.swipeXBuffer.direction = dir;
                            state.swipeXBuffer.count = 1;
                        }
                    } else {
                        state.swipeXBuffer.count = Math.max(0, state.swipeXBuffer.count - 0.5);
                    }
                }
                state.lastIndexX = curX;

                // --- 3. LIKE GESTURE (Thumb Up) ---
                // Thumb tip higher than index tip AND other fingers folded
                const isThumbUp = thumbTip.y < indexTip.y - 0.1 &&
                    midTip.y > landmarks[9].y &&
                    ringTip.y > landmarks[13].y &&
                    pinkyTip.y > landmarks[17].y;

                if (isThumbUp) {
                    state.likeBuffer++;
                    if (state.likeBuffer > 5) {
                        triggerLike();
                        state.likeBuffer = -20; // Cooldown
                    }
                } else {
                    state.likeBuffer = Math.max(0, state.likeBuffer - 1);
                }

                // --- 4. VIDEO CONTROL (Fist) ---
                const isFist = dist(indexTip, landmarks[5]) < 0.08 &&
                    dist(midTip, landmarks[9]) < 0.08 &&
                    dist(ringTip, landmarks[13]) < 0.08 &&
                    dist(pinkyTip, landmarks[17]) < 0.08;

                if (isFist) {
                    state.fistBuffer++;
                    if (state.fistBuffer > 5) {
                        if (!state.isPaused) {
                            state.isPaused = true;
                            toggleVideo(true);
                        }
                    }
                } else {
                    state.fistBuffer = 0;
                    if (state.isPaused) {
                        state.isPaused = false;
                        toggleVideo(false);
                    }
                }

                // Visual Feedback (Landmarks)
                drawHandOverlay(canvasCtx, landmarks, W, H, isThumbUp, isFist, scrollMode);
            } else {
                state.lastIndexY = null;
                state.lastIndexX = null;
            }
        });

        const camera = new window.Camera(videoRef.current, {
            onFrame: async () => await hands.send({ image: videoRef.current }),
            width: 1280, height: 720
        });

        camera.start().then(() => setModelLoaded(true));

        // Animation Loop for Physics-based Scrolling
        let rafId;
        const animate = () => {
            const state = engine.current;
            if (scrollContainerRef.current) {
                // Apply velocity
                state.scrollPos += state.scrollVelocity;
                state.scrollVelocity *= state.friction;

                // Boundary constraints
                const maxScroll = scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight;
                if (state.scrollPos < 0) {
                    state.scrollPos = 0;
                    state.scrollVelocity = 0;
                } else if (state.scrollPos > maxScroll) {
                    state.scrollPos = maxScroll;
                    state.scrollVelocity = 0;
                }

                scrollContainerRef.current.scrollTop = state.scrollPos;

                // Autoplay videos based on visibility
                updateVideoAutoplay();
            }
            rafId = requestAnimationFrame(animate);
        };
        rafId = requestAnimationFrame(animate);

        return () => {
            hands.close();
            camera.stop();
            cancelAnimationFrame(rafId);
        };
    }, []);

    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    const drawHandOverlay = (ctx, landmarks, W, H, isThumbUp, isFist, scrollMode) => {
        ctx.save();
        ctx.translate(W, 0); ctx.scale(-1, 1);

        // Draw connections
        let color = 'rgba(255,255,255,0.3)';
        if (isThumbUp) color = '#f43f5e';
        else if (isFist) color = '#fbbf24';
        else if (scrollMode) color = '#3b82f6';

        window.drawConnectors?.(ctx, landmarks, window.HAND_CONNECTIONS, {
            color: color,
            lineWidth: 2
        });

        landmarks.forEach((p, i) => {
            const px = p.x * W;
            const py = p.y * H;
            ctx.beginPath();
            ctx.arc(px, py, (i === 8 || i === 4) ? 6 : 3, 0, Math.PI * 2);
            ctx.fillStyle = (i === 8) ? '#3b82f6' : (i === 4 ? '#f43f5e' : '#fff');
            ctx.fill();
        });
        ctx.restore();
    };

    const triggerLike = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const viewportCenter = container.scrollTop + container.clientHeight / 2;
        const postElements = container.querySelectorAll('.insta-post');

        postElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const elCenter = el.offsetTop + el.clientHeight / 2;

            if (Math.abs(viewportCenter - elCenter) < 300) {
                const postId = parseInt(el.dataset.id);
                if (!engine.current.likedPosts.has(postId)) {
                    engine.current.likedPosts.add(postId);

                    // Show animation
                    const heart = el.querySelector('.floating-heart');
                    if (heart) {
                        heart.classList.add('animate-heart');
                        setTimeout(() => heart.classList.remove('animate-heart'), 1000);
                    }

                    // Update UI state (though we try to avoid state, likes need to persist visually)
                    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1, isLiked: true } : p));
                }
            }
        });
    };

    const toggleVideo = (pause) => {
        const videos = scrollContainerRef.current?.querySelectorAll('video');
        videos?.forEach(v => {
            if (pause) v.pause();
            else v.play().catch(() => { });
        });
    };

    const updateVideoAutoplay = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const videos = container.querySelectorAll('.post-video');
        videos.forEach(v => {
            const rect = v.getBoundingClientRect();
            const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
            const isMostlyVisible = visibleHeight > rect.height * 0.6;

            if (isMostlyVisible && !engine.current.isPaused) {
                if (v.paused) v.play().catch(() => { });
            } else {
                if (!v.paused) v.pause();
            }
        });
    };

    return (
        <div style={{
            width: '100vw', height: '100vh',
            background: '#000',
            position: 'relative', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}>
            {/* Camera Overlay Layer */}
            <video ref={videoRef} style={{
                position: 'absolute', width: '100%', height: '100%',
                objectFit: 'cover', transform: 'scaleX(-1)', opacity: 0.15,
                zIndex: 0, pointerEvents: 'none'
            }} />
            <canvas ref={canvasRef} style={{
                position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none'
            }} width={1280} height={720} />

            {/* Insta Feed Layer - Moved to Right */}
            <div
                ref={scrollContainerRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: '500px',
                    overflowY: 'hidden', // Controlled by JS
                    zIndex: 10,
                    display: 'flex', flexDirection: 'column',
                    background: '#000',
                    borderLeft: '1px solid #262626',
                    boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                    scrollBehavior: 'auto'
                }}
            >
                <div style={{ width: '100%', background: '#000' }}>
                    {/* Header */}
                    <div className="insta-header">
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontStyle: 'italic' }}>Instagram</div>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" /><path d="M12 8v1a3 3 0 0 0 3 3h1" /></svg>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </div>
                    </div>

                    {/* Posts */}
                    {posts.map(post => (
                        <div key={post.id} data-id={post.id} className="insta-post" style={{ marginBottom: '20px', borderBottom: '1px solid #262626' }}>
                            {/* User Info */}
                            <div className="post-user">
                                <img src={post.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{post.user}</span>
                                <span style={{ marginLeft: 'auto' }}>•••</span>
                            </div>

                            {/* Content */}
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {post.type === 'image' ? (
                                    <img src={post.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <video className="post-video" src={post.url} loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                )}

                                {/* Floating Heart Overlay */}
                                <div className="floating-heart">❤️</div>
                            </div>

                            {/* Actions */}
                            <div className="post-actions">
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill={post.isLiked ? "#ed4956" : "none"} stroke={post.isLiked ? "#ed4956" : "white"} strokeWidth="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                                </div>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ marginLeft: 'auto' }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                            </div>

                            {/* Captions */}
                            <div className="post-caption">
                                <div style={{ fontWeight: 600, marginBottom: '5px' }}>{post.likes.toLocaleString()} likes</div>
                                <div><span style={{ fontWeight: 600 }}>{post.user}</span> {post.caption}</div>
                            </div>
                        </div>
                    ))}

                    {/* Buffer for bottom */}
                    <div style={{ height: '100px' }} />
                </div>
            </div>

            {/* Gesture Guide HUD */}
            <div style={{
                position: 'absolute', top: '80px', right: '40px',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                padding: '15px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', zIndex: 100, fontSize: '0.8rem', pointerEvents: 'none'
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#3b82f6' }}>GESTURE CONTROLS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>☝️ <b>Move Index:</b> Scroll Feed</div>
                    <div>👍 <b>Thumb Up:</b> Like Post</div>
                    <div>✊ <b>Fist:</b> Pause Video</div>
                    <div>↔️ <b>Large Swipe:</b> Change Page</div>
                </div>
            </div>

            <style>{`
                .insta-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 15px 20px; border-bottom: 1px solid #262626; color: white;
                    position: sticky; top: 0; background: black; z-index: 5;
                }
                .post-user {
                    display: flex; align-items: center; gap: 10px; padding: 10px 15px; color: white;
                }
                .post-actions {
                    display: flex; align-items: center; padding: 10px 15px; color: white;
                }
                .post-caption {
                    padding: 0 15px 15px; color: white; font-size: 0.9rem; line-height: 1.4;
                }
                .floating-heart {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0);
                    font-size: 80px; opacity: 0; pointer-events: none;
                    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .animate-heart {
                    animation: heartPop 1s forwards;
                }
                @keyframes heartPop {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    20% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                    50% { transform: translate(-50%, -55%) scale(1); opacity: 0.8; }
                    100% { transform: translate(-50%, -80%) scale(1); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default GestureInstaFeed;
