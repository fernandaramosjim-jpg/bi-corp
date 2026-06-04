import { ImageResponse } from "next/og";

export const size        = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
          borderRadius: "23%",
        }}
      >
        {/* BI letras */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "6px",
          }}
        >
          <span
            style={{
              fontSize: 220,
              fontWeight: 900,
              color: "white",
              lineHeight: 1,
              letterSpacing: "-8px",
              fontFamily: "serif",
            }}
          >
            B
          </span>
          <span
            style={{
              fontSize: 220,
              fontWeight: 900,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1,
              fontFamily: "serif",
            }}
          >
            I
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
