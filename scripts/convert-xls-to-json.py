#!/usr/bin/env python3
"""Converte planilhas XLS em JSON para uso nos mapas."""

import json
import re
import sys
from pathlib import Path

import xlrd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "maps"


def parse_municipio_uf(raw: str) -> tuple[str, str] | None:
    if not raw or raw.startswith("Não Localizados") or raw == "Total":
        return None
    if "Fonte:" in raw:
        return None

    match = re.match(r"^(.+?)\s*-\s*([A-Z]{2})\s*$", raw.strip())
    if not match:
        return None

    return match.group(1).strip(), match.group(2).strip()


def parse_value(raw) -> float | None:
    if raw in ("", "-", None):
        return None
    try:
        value = float(raw)
        return value if value > 0 else None
    except (TypeError, ValueError):
        return None


def convert_xls(xls_path: Path, map_id: str, title: str, year: int) -> dict:
    wb = xlrd.open_workbook(str(xls_path))
    sheet = wb.sheet_by_index(0)

    municipios = []
    for row in range(4, sheet.nrows):
        name_raw = sheet.cell_value(row, 0)
        parsed = parse_municipio_uf(str(name_raw))
        if not parsed:
            continue

        nome, uf = parsed
        valor = parse_value(sheet.cell_value(row, 1))
        if valor is None:
            continue

        municipios.append({"nome": nome, "uf": uf, "valor": valor})

    return {
        "id": map_id,
        "titulo": title,
        "ano": year,
        "descricao": "Distribuição dos EES por municípios no Brasil",
        "totalMunicipios": len(municipios),
        "municipios": municipios,
    }


def main():
    if len(sys.argv) < 2:
        xls_path = ROOT / "Tabela2008 (5).xls"
        map_id = "2008"
        title = "Tabela 2008 — EES por município"
        year = 2008
    else:
        xls_path = Path(sys.argv[1])
        map_id = sys.argv[2] if len(sys.argv) > 2 else xls_path.stem
        title = sys.argv[3] if len(sys.argv) > 3 else f"Mapa {map_id}"
        year = int(sys.argv[4]) if len(sys.argv) > 4 else int(map_id)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data = convert_xls(xls_path, map_id, title, year)

    out_path = DATA_DIR / f"{map_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Gerado: {out_path} ({data['totalMunicipios']} municípios com valor)")


if __name__ == "__main__":
    main()
