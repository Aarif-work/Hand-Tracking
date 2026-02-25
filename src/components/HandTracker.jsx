import React, { useRef, useEffect, useState } from 'react';

const HandTracker = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [handVisible, setHandVisible] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);

    useEffect(() => {
        if (!window.Hands || !window.Camera) {
            console.error('MediaPipe scripts not loaded');
            return;
        }

        const hands = new window.Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults((results) => {
            if (!canvasRef.current || !videoRef.current) return;

            const canvasCtx = canvasRef.current.getContext('2d');
            const { width, height } = canvasRef.current;

            canvasCtx.save();
            canvasCtx.clearRect(0, 0, width, height);

            // Draw the video frame
            canvasCtx.drawImage(results.image, 0, 0, width, height);

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                setHandVisible(true);
                for (const landmarks of results.multiHandLandmarks) {
                    // Connections might be in window.HAND_CONNECTIONS or window.Hands.HAND_CONNECTIONS
                    const connections = window.HAND_CONNECTIONS || (window.Hands && window.Hands.HAND_CONNECTIONS);
                    if (window.drawConnectors && connections) {
                        window.drawConnectors(canvasCtx, landmarks, connections, { color: '#00FF00', lineWidth: 5 });
                    }
                    if (window.drawLandmarks) {
                        window.drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });
                    }
                }
            } else {
                setHandVisible(false);
            }
            canvasCtx.restore();
        });

        const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
                await hands.send({ image: videoRef.current });
            },
            width: 640,
            height: 480
        });

        camera.start().then(() => {
            setModelLoaded(true);
        });

        return () => {
            hands.close();
            camera.stop();
        };
    }, []);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: handVisible ? '#2ecc71' : '#e74c3c',
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: '"Outfit", sans-serif',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                padding: '30px',
                borderRadius: '24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
                <h1 style={{
                    color: 'white',
                    marginBottom: '20px',
                    fontSize: '2.5rem',
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    margin: '0 0 20px 0'
                }}>
                    Hand Detection
                </h1>

                <div style={{
                    position: 'relative',
                    width: '640px',
                    height: '480px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    backgroundColor: '#000',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}>
                    {!modelLoaded && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            zIndex: 10
                        }}>
                            Initializing Camera & Model...
                        </div>
                    )}
                    <video
                        ref={videoRef}
                        style={{ display: 'none' }}
                        width="640"
                        height="480"
                    />
                    <canvas
                        ref={canvasRef}
                        width="640"
                        height="480"
                        style={{
                            width: '100%',
                            height: '100%',
                            transform: 'scaleX(-1)' // Flip horizontally for mirror effect
                        }}
                    />
                </div>

                <div style={{
                    marginTop: '30px',
                    color: 'white',
                    fontSize: '1.8rem',
                    fontWeight: '600',
                    padding: '10px 40px',
                    borderRadius: '100px',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: handVisible ? '#2ecc71' : '#e74c3c',
                        boxShadow: `0 0 10px ${handVisible ? '#2ecc71' : '#e74c3c'}`
                    }} />
                    {handVisible ? 'Hand Detected' : 'No Hand Detected'}
                </div>
            </div>

            <p style={{
                color: 'rgba(255,255,255,0.7)',
                marginTop: '20px',
                fontSize: '0.9rem'
            }}>
                Powered by MediaPipe & React
            </p>
        </div>
    );
};

export default HandTracker;
