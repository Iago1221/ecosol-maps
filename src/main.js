import L from "leaflet";
import "./style.css";

const BRAZIL_CENTER = [-14.235, -51.9253];
const BRAZIL_ZOOM = 4;

let map = null;
let markersLayer = null;
let currentMapData = null;
let selectedMarker = null;

const detailsPanel = () => document.getElementById("details-panel");
const detailsContent = () => document.getElementById("details-content");
const detailsTitle = () => document.getElementById("details-title");
const detailsBackdrop = () => document.getElementById("details-backdrop");

function isMobile() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function getMarkerRadius(selected = false) {
  const base = isMobile() ? 8 : 6;
  return selected ? base + 3 : base;
}

function initMap() {
  map = L.map("map", {
    center: BRAZIL_CENTER,
    zoom: BRAZIL_ZOOM,
    minZoom: 3,
    maxZoom: 12,
  });

  const ruas = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  });

  const sateliteImagery = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, AeroGRID, IGN, IGP, and the GIS User Community",
      maxZoom: 19,
    }
  );

  const sateliteLabels = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Labels &copy; Esri",
      maxZoom: 19,
      pane: "overlayPane",
    }
  );

  const satelite = L.layerGroup([sateliteImagery, sateliteLabels]);

  ruas.addTo(map);

  L.control
    .layers(
      { Ruas: ruas, Satélite: satelite },
      null,
      { position: "topright" }
    )
    .addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  window.addEventListener("resize", () => map.invalidateSize());
  setupDetailsPanel();
}

function closeDetails() {
  const panel = detailsPanel();
  const backdrop = detailsBackdrop();
  if (panel) {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
  }
  if (backdrop) {
    backdrop.classList.remove("is-visible");
    backdrop.setAttribute("aria-hidden", "true");
  }
  if (selectedMarker) {
    selectedMarker.setStyle({ weight: 1, radius: getMarkerRadius() });
    selectedMarker = null;
  }
}

function openDetails(municipio, color) {
  const panel = detailsPanel();
  const content = detailsContent();
  const title = detailsTitle();
  if (!panel || !content) return;

  if (selectedMarker) {
    selectedMarker.setStyle({ weight: 1, radius: getMarkerRadius() });
  }

  selectedMarker = municipio._marker;
  if (selectedMarker) {
    selectedMarker.setStyle({ weight: 3, radius: getMarkerRadius(true) });
    selectedMarker.bringToFront();
  }

  title.textContent = `${municipio.nome} — ${municipio.uf}`;

  const rows = [
    ["Município", `${municipio.nome} — ${municipio.uf}`],
    ["Quantidade de EES", municipio.valor],
    ["Código IBGE", municipio.codigo_ibge ?? "—"],
    [
      "Coordenadas",
      municipio.latitude != null
        ? `${municipio.latitude.toFixed(4)}, ${municipio.longitude.toFixed(4)}`
        : "—",
    ],
  ];

  if (currentMapData) {
    rows.push(["Mapa / ano", `${currentMapData.titulo} (${currentMapData.ano})`]);
  }

  content.innerHTML = `
    <div class="details-swatch" style="background:${color}"></div>
    <dl class="details-list">
      ${rows
        .map(
          ([label, value]) => `
        <div class="details-row">
          <dt>${label}</dt>
          <dd>${value}</dd>
        </div>`
        )
        .join("")}
    </dl>
  `;

  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");

  const backdrop = detailsBackdrop();
  if (backdrop) {
    backdrop.classList.add("is-visible");
    backdrop.setAttribute("aria-hidden", "false");
  }
}

function setupDetailsPanel() {
  document.getElementById("details-close")?.addEventListener("click", closeDetails);
  detailsBackdrop()?.addEventListener("click", closeDetails);
  map.on("click", () => closeDetails());
}

function getColorScale(min, max) {
  return (value) => {
    if (max === min) return "#1a5276";
    const t = (value - min) / (max - min);
    // Escala de azul claro → azul escuro
    const r = Math.round(198 - t * 160);
    const g = Math.round(226 - t * 170);
    const b = Math.round(247 - t * 80);
    return `rgb(${r}, ${g}, ${b})`;
  };
}

function renderLegend(min, max, getColor) {
  const legend = document.getElementById("legend");
  const steps = 5;
  const items = [];

  for (let i = 0; i <= steps; i++) {
    const value = min + ((max - min) * i) / steps;
    const label = i === 0 ? min : i === steps ? max : Math.round(value);
    items.push(`
      <div class="legend-item">
        <span class="legend-color" style="background:${getColor(value)}"></span>
        <span>${label}</span>
      </div>
    `);
  }

  legend.innerHTML = `
    <h3>Quantidade de EES</h3>
    <div class="legend-scale">${items.join("")}</div>
    <p class="legend-note">Cor mais escura = valor maior</p>
  `;
}

function renderInfo(mapData) {
  const info = document.getElementById("info");
  info.innerHTML = `
    <strong>${mapData.titulo}</strong>
    <span>${mapData.totalGeocodificados ?? mapData.totalMunicipios} municípios exibidos</span>
  `;
}

function renderMapData(mapData) {
  currentMapData = mapData;
  closeDetails();
  markersLayer.clearLayers();

  const valores = mapData.municipios.map((m) => m.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const getColor = getColorScale(min, max);

  const bounds = [];

  for (const m of mapData.municipios) {
    if (m.latitude == null || m.longitude == null) continue;

    const color = getColor(m.valor);
    const latlng = [m.latitude, m.longitude];
    bounds.push(latlng);

    const marker = L.circleMarker(latlng, {
      radius: getMarkerRadius(),
      fillColor: color,
      color: "#2c3e50",
      weight: 1,
      opacity: 0.85,
      fillOpacity: 0.75,
    });

    marker.bindTooltip(
      `<strong>${m.nome} - ${m.uf}</strong><br/>EES: ${m.valor}`,
      { direction: "top", offset: [0, -4] }
    );

    m._marker = marker;
    marker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      openDetails(m, color);
    });

    marker.addTo(markersLayer);
  }

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
  } else {
    map.setView(BRAZIL_CENTER, BRAZIL_ZOOM);
  }

  renderLegend(min, max, getColor);
  renderInfo(mapData);
}

async function loadMapIndex() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/maps-index.json`);
  if (!res.ok) throw new Error("Não foi possível carregar o índice de mapas");
  return res.json();
}

async function loadMapData(arquivo) {
  const res = await fetch(`${import.meta.env.BASE_URL}data/maps/${arquivo}`);
  if (!res.ok) throw new Error(`Não foi possível carregar ${arquivo}`);
  return res.json();
}

async function setupMapSelect(mapas) {
  const select = document.getElementById("map-select");
  select.innerHTML = "";

  for (const m of mapas) {
    const option = document.createElement("option");
    option.value = m.arquivo;
    option.textContent = m.titulo;
    option.dataset.id = m.id;
    select.appendChild(option);
  }

  select.addEventListener("change", async () => {
    const arquivo = select.value;
    const mapData = await loadMapData(arquivo);
    renderMapData(mapData);
  });

  if (mapas.length > 0) {
    const mapData = await loadMapData(mapas[0].arquivo);
    renderMapData(mapData);
  }
}

async function main() {
  initMap();

  try {
    const index = await loadMapIndex();
    await setupMapSelect(index.mapas);
  } catch (err) {
    console.error(err);
    document.getElementById("info").textContent =
      "Erro ao carregar dados. Execute: npm run data:build";
  }
}

main();
