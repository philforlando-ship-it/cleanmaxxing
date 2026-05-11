// Alignment overlays for CameraCapture. Each one is a small SVG that
// fills its container — pass directly to <CameraCapture overlay={...}>.
// Visual style: dashed white strokes with 60% opacity so the live
// preview reads through; one short label at the bottom so the user
// knows what they're aiming for.
//
// Coordinates are 100x100 viewBox so the overlay scales cleanly to
// whatever aspect ratio the camera container ends up with.

type OverlayProps = {
  // Optional one-line label rendered at the bottom of the overlay.
  // Defaults to a per-overlay sensible string; pass null to suppress.
  label?: string | null;
};

const STROKE = 'rgba(255,255,255,0.6)';
const STROKE_WIDTH = 0.4;
const DASH = '2 1.5';

function OverlayFrame({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string | null;
}) {
  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {children}
      </svg>
      {label && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/40 px-2 py-1 text-[10px] uppercase tracking-wider text-white">
          {label}
        </div>
      )}
    </div>
  );
}

// Vertical face oval centered horizontally, sized for a head-and-
// shoulders selfie. Used for the front-facing baseline + 'styled'
// hair shots.
export function FaceOvalOverlay({ label = 'Center your face in the oval' }: OverlayProps = {}) {
  return (
    <OverlayFrame label={label}>
      <ellipse
        cx="50"
        cy="42"
        rx="22"
        ry="30"
        fill="none"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={DASH}
      />
    </OverlayFrame>
  );
}

// Horizontal marker at the upper third where the hairline should
// land, plus thin vertical center line so left-right is symmetric.
// For the 'hairline' close-up — we want the hairline edge near the
// horizontal guide, not the eyebrows.
export function HairlineOverlay({
  label = 'Line up your hairline with the dashed line',
}: OverlayProps = {}) {
  return (
    <OverlayFrame label={label}>
      <line
        x1="10"
        y1="35"
        x2="90"
        y2="35"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={DASH}
      />
      <line
        x1="50"
        y1="10"
        x2="50"
        y2="90"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH * 0.7}
        strokeDasharray={DASH}
        opacity={0.5}
      />
    </OverlayFrame>
  );
}

// Crown / top-down: camera held above the head looking down. Circle
// in the middle marks where the crown should center; the crosshair
// helps users hold the phone level (camera tilt skews the read).
export function CrownOverlay({
  label = 'Hold camera above your head, crown centered',
}: OverlayProps = {}) {
  return (
    <OverlayFrame label={label}>
      <circle
        cx="50"
        cy="50"
        r="22"
        fill="none"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={DASH}
      />
      <line
        x1="50"
        y1="20"
        x2="50"
        y2="80"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH * 0.7}
        opacity={0.4}
      />
      <line
        x1="20"
        y1="50"
        x2="80"
        y2="50"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH * 0.7}
        opacity={0.4}
      />
    </OverlayFrame>
  );
}

// Side profile: vertical guide where the back of the head should sit,
// shorter horizontal at the eye line so user can level the camera.
// 'mirror' flips left↔right for the OTHER side profile (side_right).
export function SideProfileOverlay({
  label = 'Profile centered, eye line on the horizontal',
  mirror = false,
}: OverlayProps & { mirror?: boolean } = {}) {
  // Left side default — vertical guide at x=35 (back-of-head edge).
  const x = mirror ? 65 : 35;
  return (
    <OverlayFrame label={label}>
      <line
        x1={x}
        y1="10"
        x2={x}
        y2="90"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={DASH}
      />
      <line
        x1="20"
        y1="42"
        x2="80"
        y2="42"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH * 0.7}
        strokeDasharray={DASH}
        opacity={0.5}
      />
    </OverlayFrame>
  );
}

// Full body silhouette — standing, head-to-feet. For the body-angle
// onboarding shots. Dashed simplified outline; not realistic, just a
// "stand back and frame yourself like this" guide.
export function FullBodyOverlay({
  label = 'Stand back so head and feet are both in frame',
}: OverlayProps = {}) {
  return (
    <OverlayFrame label={label}>
      {/* Head */}
      <circle
        cx="50"
        cy="14"
        r="6"
        fill="none"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={DASH}
      />
      {/* Torso + arms (simplified rectangles — sized to fill ~70% of frame) */}
      <line
        x1="50"
        y1="20"
        x2="50"
        y2="65"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={DASH}
      />
      {/* Shoulders */}
      <line
        x1="38"
        y1="26"
        x2="62"
        y2="26"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={DASH}
      />
      {/* Arms */}
      <line
        x1="38"
        y1="26"
        x2="34"
        y2="55"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH * 0.7}
        strokeDasharray={DASH}
        opacity={0.6}
      />
      <line
        x1="62"
        y1="26"
        x2="66"
        y2="55"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH * 0.7}
        strokeDasharray={DASH}
        opacity={0.6}
      />
      {/* Legs */}
      <line
        x1="50"
        y1="65"
        x2="44"
        y2="92"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={DASH}
      />
      <line
        x1="50"
        y1="65"
        x2="56"
        y2="92"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={DASH}
      />
    </OverlayFrame>
  );
}
