#!/usr/bin/env python3
"""Gera GeoJSON simplificado dos municípios brasileiros (fronteiras IBGE via geobr)."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "geo" / "municipios-br.geojson"

SIMPLIFY_TOLERANCE = 0.01
COORD_PRECISION = 3


def round_coords(coords, precision):
    if isinstance(coords[0], (float, int)):
        return [round(c, precision) for c in coords]
    return [round_coords(c, precision) for c in coords]


def main():
    try:
        import geobr
        from shapely.geometry import mapping
        from shapely import simplify
    except ImportError:
        print(
            "Dependências ausentes. Execute:\n"
            "  python3 -m venv .venv && .venv/bin/pip install geobr shapely",
            file=sys.stderr,
        )
        sys.exit(1)

    print("Baixando malha municipal simplificada (IBGE 2020 via geobr)...")
    gdf = geobr.read_municipality(code_muni="all", year=2020, simplified=True)

    features = []
    for _, row in gdf.iterrows():
        geom = simplify(row.geometry, SIMPLIFY_TOLERANCE, preserve_topology=True)
        geometry = mapping(geom)
        geometry["coordinates"] = round_coords(geometry["coordinates"], COORD_PRECISION)
        features.append(
            {
                "type": "Feature",
                "properties": {"codigo_ibge": int(row.code_muni)},
                "geometry": geometry,
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    geojson = {"type": "FeatureCollection", "features": features}
    OUT.write_text(json.dumps(geojson, separators=(",", ":")), encoding="utf-8")

    size_mb = OUT.stat().st_size / 1024 / 1024
    print(f"Salvo {OUT} ({len(features)} municípios, {size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
