import React from 'react';

const PrivacyPolicy = ({ onBack }) => {
    return (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '6rem 2rem',
            color: 'var(--text)',
            lineHeight: 1.8,
            fontFamily: 'Inter, sans-serif'
        }}>
            <h1 className="title-font" style={{ fontSize: '3rem', marginBottom: '2rem', color: 'var(--primary)' }}>Privacy Policy</h1>

            <section style={{ marginBottom: '3rem' }}>
                <h2 className="title-font" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>1. Personal Data Handling</h2>
                <p>
                    Motion Puzzle Studio is designed with a "privacy-first" architecture. We do <strong>not</strong> collect, store, or transmit any personal data, images, or video feeds to external servers. All processing is performed entirely on your local device.
                </p>
            </section>

            <section style={{ marginBottom: '3rem' }}>
                <h2 className="title-font" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>2. Camera Usage</h2>
                <p>
                    The application requires access to your device's camera to enable motion-gesture controls. This feed is used exclusively for real-time hand-tracking via the MediaPipe AI framework.
                </p>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem' }}>
                    <li>Images are processed frame-by-frame in your browser's memory.</li>
                    <li>No video data is recorded, saved, or uploaded.</li>
                    <li>The camera session terminates immediately when you exit the game or close the tab.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '3rem' }}>
                <h2 className="title-font" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>3. Third-Party Libraries</h2>
                <p>
                    We utilize Google’s MediaPipe and JSDelivr CDN to load the necessary tracking models. These service providers do not receive any of your camera data; they only serve the static model files required for the browser to perform local tracking.
                </p>
            </section>

            <section style={{ marginBottom: '3rem' }}>
                <h2 className="title-font" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>4. Your Consent</h2>
                <p>
                    By using this application and granting camera permissions, you agree to this local processing of data for the purpose of gameplay. You can revoke camera permissions at any time through your browser settings.
                </p>
            </section>

            <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                Last Updated: April 2026 | Motion Puzzle Studio Team
            </div>
        </div>
    );
};

export default PrivacyPolicy;
