import Maps from "../../../components/Maps";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        gap: 16,
        padding: 16,
        background: "#0b0b0f",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 500,
          borderRadius: 16,
          padding: 16,
          color: "white",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          Controls
        </div>

        <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.5 }}>
          Use the slider on the map to change radius. Click the map to move the
          circle and re-fetch traffic lights.
        </div>

        <div style={{ marginTop: 16, fontSize: 11, opacity: 0.65 }}>
          Data: OpenStreetMap (Overpass)
        </div>
      </aside>

      {/* Map container */}
      <div
        style={{
          flex: 1,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <Maps />
      </div>
    </div>
  );
}