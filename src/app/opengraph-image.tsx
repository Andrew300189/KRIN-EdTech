import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "KRIN EdTech English courses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          color: "#0f172a",
          background: "#f8fafc",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "#2563eb", fontSize: 34, fontWeight: 700 }}>
          <span style={{ display: "flex", width: 40, height: 40, borderRadius: 12, background: "#2563eb" }} />
          KRIN EdTech
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "930px" }}>
          <span style={{ color: "#2563eb", fontSize: 28, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>English courses A1–C2</span>
          <span style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>Choose a clear next step in English.</span>
          <span style={{ color: "#475569", fontSize: 30, lineHeight: 1.4 }}>Review the programme, try an available lesson and learn at a sustainable pace.</span>
        </div>
        <div style={{ display: "flex", gap: "12px", color: "#475569", fontSize: 26 }}><span>A1</span><span>•</span><span>A2</span><span>•</span><span>B1</span><span>•</span><span>B2</span><span>•</span><span>C1</span><span>•</span><span>C2</span></div>
      </div>
    ),
    size,
  );
}
