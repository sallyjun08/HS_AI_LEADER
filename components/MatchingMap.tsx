import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";

export interface MapMarker {
  id: string;
  org: string;
  title: string;
  lat: number;
  lng: number;
  status: "pending" | "matched" | "completed";
}

interface Props {
  markers: MapMarker[];
}

/* ── 마커 상태별 설정 ─────────────────────────────────────── */
const CFG: Record<
  MapMarker["status"],
  { color: string; glow: string; emoji: string; label: string; labelBg: string }
> = {
  pending:   { color: "#0066CC", glow: "rgba(0,102,204,0.45)",   emoji: "🔔", label: "신청 대기", labelBg: "#e0edff" },
  matched:   { color: "#16a34a", glow: "rgba(22,163,74,0.40)",   emoji: "✅", label: "수락 완료", labelBg: "#dcfce7" },
  completed: { color: "#6b7280", glow: "rgba(107,114,128,0.30)", emoji: "📚", label: "강의 완료", labelBg: "#f3f4f6" },
};

/* ── 읍면동 → 권역 색상 매핑 ─────────────────────────────── */
const DISTRICT_STYLE: Record<string, { color: string; zone: string }> = {
  "동탄1동": { color: "#1d4ed8", zone: "동탄 권역" },
  "동탄2동": { color: "#1d4ed8", zone: "동탄 권역" },
  "동탄3동": { color: "#1d4ed8", zone: "동탄 권역" },
  "동탄4동": { color: "#1d4ed8", zone: "동탄 권역" },
  "동탄5동": { color: "#1d4ed8", zone: "동탄 권역" },
  "동탄6동": { color: "#1d4ed8", zone: "동탄 권역" },
  "동탄7동": { color: "#1d4ed8", zone: "동탄 권역" },
  "동탄8동": { color: "#1d4ed8", zone: "동탄 권역" },
  "동탄9동": { color: "#1d4ed8", zone: "동탄 권역" },
  "새솔동":  { color: "#1d4ed8", zone: "동탄 권역" },
  "병점1동": { color: "#7c3aed", zone: "병점·진안 권역" },
  "병점2동": { color: "#7c3aed", zone: "병점·진안 권역" },
  "진안동":  { color: "#7c3aed", zone: "병점·진안 권역" },
  "반월동":  { color: "#7c3aed", zone: "병점·진안 권역" },
  "기배동":  { color: "#7c3aed", zone: "병점·진안 권역" },
  "화산동":  { color: "#7c3aed", zone: "병점·진안 권역" },
  "봉담읍":  { color: "#15803d", zone: "봉담·매송 권역" },
  "매송면":  { color: "#15803d", zone: "봉담·매송 권역" },
  "향남읍":  { color: "#c2410c", zone: "향남·우정 권역" },
  "우정읍":  { color: "#c2410c", zone: "향남·우정 권역" },
  "남양읍":  { color: "#0e7490", zone: "남양·마도 권역" },
  "마도면":  { color: "#0e7490", zone: "남양·마도 권역" },
  "비봉면":  { color: "#0e7490", zone: "남양·마도 권역" },
  "송산면":  { color: "#0e7490", zone: "남양·마도 권역" },
  "서신면":  { color: "#0e7490", zone: "남양·마도 권역" },
  "팔탄면":  { color: "#b45309", zone: "팔탄·장안 권역" },
  "장안면":  { color: "#b45309", zone: "팔탄·장안 권역" },
  "정남면":  { color: "#b45309", zone: "팔탄·장안 권역" },
  "양감면":  { color: "#b45309", zone: "팔탄·장안 권역" },
};

/* "화성시 봉담읍" → "봉담읍" */
function districtKey(temp: string): string {
  return temp.replace(/^화성시\s*/, "").trim();
}

/* ── 팝업 HTML ────────────────────────────────────────────── */
function buildPopup(m: MapMarker): string {
  const c = CFG[m.status];
  return (
    `<div style="font-family:'Noto Sans KR',Arial,sans-serif;min-width:180px;overflow:hidden;">` +
    `<div style="background:${c.color};padding:10px 12px 8px;">` +
    `<p style="font-size:13px;font-weight:700;color:white;margin:0 0 2px;">${m.org}</p>` +
    `<p style="font-size:11px;color:rgba(255,255,255,0.82);margin:0;">${m.title}</p>` +
    `</div>` +
    `<div style="padding:10px 12px;">` +
    `<span style="display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:${c.labelBg};color:${c.color};">` +
    `${c.emoji} ${c.label}</span>` +
    `</div></div>`
  );
}

/* ── 마커 아이콘 ──────────────────────────────────────────── */
function buildIcon(m: MapMarker): L.DivIcon {
  const c         = CFG[m.status];
  const isPending = m.status === "pending";

  return L.divIcon({
    html: `
      <div style="position:relative;width:64px;height:64px;display:flex;align-items:center;justify-content:center;">
        ${isPending ? `
          <div class="map-ping" style="position:absolute;inset:2px;border-radius:50%;border:3px solid ${c.color};opacity:0.7;"></div>
          <div class="map-ping" style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${c.color};opacity:0.45;animation-delay:0.65s;"></div>
        ` : ""}
        <div style="position:absolute;width:50px;height:50px;border-radius:50%;background:${c.color}22;border:2px solid ${c.color}66;"></div>
        <div style="
          width:40px;height:40px;border-radius:50%;
          background:${c.color};
          border:3px solid white;
          box-shadow:0 4px 18px ${c.glow},0 2px 6px rgba(0,0,0,0.18);
          display:flex;align-items:center;justify-content:center;
          font-size:18px;line-height:1;
          position:relative;z-index:1;
        ">${c.emoji}</div>
      </div>`,
    className:   "",
    iconSize:    [64, 64],
    iconAnchor:  [32, 32],
    popupAnchor: [0, -36],
  });
}

/* ── 메인 컴포넌트 ────────────────────────────────────────── */
export default function MatchingMap({ markers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center:          [37.1997, 126.98],
      zoom:            11,
      zoomControl:     false,
      scrollWheelZoom: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> © <a href='https://carto.com/'>CARTO</a>",
        subdomains:   "abcd",
        maxZoom:      19,
        detectRetina: true,
      }
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    /* ── 행정 경계 GeoJSON 레이어 ── */
    fetch("/hwaseong-districts.geojson")
      .then((r) => r.json())
      .then((geojson) => {
        L.geoJSON(geojson, {
          style: (feature) => {
            const key   = districtKey(feature?.properties?.temp ?? "");
            const style = DISTRICT_STYLE[key];
            const color = style?.color ?? "#94a3b8";
            return {
              color,
              weight:      1.8,
              dashArray:   "5, 4",
              fillColor:   color,
              fillOpacity: 0.08,
              opacity:     0.70,
            };
          },
          onEachFeature: (feature, layer) => {
            const key      = districtKey(feature?.properties?.temp ?? "");
            const style    = DISTRICT_STYLE[key];
            const color    = style?.color ?? "#64748b";
            const zoneName = style?.zone ?? "";

            layer.bindTooltip(
              `<div style="
                font-family:'Noto Sans KR',sans-serif;
                font-size:11px;font-weight:700;
                color:${color};
                background:white;
                border:1.5px solid ${color};
                border-radius:6px;
                padding:3px 8px;
                white-space:nowrap;
                box-shadow:0 2px 6px rgba(0,0,0,0.15);
              ">${key}<br/><span style="font-size:10px;font-weight:400;color:#64748b;">${zoneName}</span></div>`,
              {
                permanent:  false,
                sticky:     true,
                opacity:    1,
                className:  "district-tooltip",
                direction:  "top",
              }
            );

            layer.on("mouseover", () => {
              (layer as L.Path).setStyle({ fillOpacity: 0.22, weight: 2.5 });
            });
            layer.on("mouseout", () => {
              (layer as L.Path).setStyle({ fillOpacity: 0.08, weight: 1.8 });
            });
          },
        }).addTo(map);
      });

    /* ── 강의 마커 ── */
    markers.forEach((m) => {
      L.marker([m.lat, m.lng], { icon: buildIcon(m) })
        .addTo(map)
        .bindPopup(buildPopup(m), { maxWidth: 240, className: "custom-popup" });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
