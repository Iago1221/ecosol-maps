#!/usr/bin/env python3
"""Enriquece dados de mapas com coordenadas (nome + UF → lat/lng)."""

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "maps"
REF_PATH = ROOT / "data" / "municipios-ref.json"

# Nomes antigos ou grafias alternativas → nome atual na base IBGE
ALIASES: dict[tuple[str, str], tuple[str, str]] = {
    ("eldorado dos carajas", "PA"): ("eldorado do carajas", "PA"),
    ("embu", "SP"): ("embu das artes", "SP"),
    ("iguaraci", "PE"): ("iguaracy", "PE"),
    ("itapage", "CE"): ("itapaje", "CE"),
    ("poxoreo", "MT"): ("poxoreu", "MT"),
    ("presidente juscelino", "RN"): ("triunfo potiguar", "RN"),
    ("santa isabel do para", "PA"): ("santa izabel do para", "PA"),
    ("sao caitano", "PE"): ("sao caetano", "PE"),
}


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    return text


def codigo_uf_to_sigla() -> dict[int, str]:
    return {
        11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
        21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL",
        28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR",
        42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF",
    }


def build_reference_index() -> dict[tuple[str, str], dict]:
    uf_map = codigo_uf_to_sigla()
    with open(REF_PATH, encoding="utf-8-sig") as f:
        municipios = json.load(f)

    index: dict[tuple[str, str], dict] = {}
    for m in municipios:
        uf_sigla = uf_map.get(m["codigo_uf"])
        if not uf_sigla:
            continue
        key = (normalize(m["nome"]), uf_sigla)
        index[key] = {
            "codigo_ibge": m["codigo_ibge"],
            "latitude": m["latitude"],
            "longitude": m["longitude"],
        }
    return index


def geocode_map(map_path: Path, ref_index: dict[tuple[str, str], dict]) -> dict:
    with open(map_path, encoding="utf-8") as f:
        data = json.load(f)

    geocoded = []
    not_found = []

    for m in data["municipios"]:
        key = (normalize(m["nome"]), m["uf"])
        alias = ALIASES.get(key)
        if alias:
            key = alias
        ref = ref_index.get(key)

        if ref:
            geocoded.append({**m, **ref})
        else:
            not_found.append(m)

    result = {
        **data,
        "totalGeocodificados": len(geocoded),
        "totalNaoEncontrados": len(not_found),
        "municipios": geocoded,
    }

    if not_found:
        result["naoEncontrados"] = not_found

    return result


def main():
    ref_index = build_reference_index()
    print(f"Referência carregada: {len(ref_index)} municípios")

    for map_path in sorted(DATA_DIR.glob("*.json")):
        if map_path.name.endswith("-geocoded.json"):
            continue

        out_path = map_path.with_name(f"{map_path.stem}-geocoded.json")
        result = geocode_map(map_path, ref_index)

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(
            f"{map_path.name}: {result['totalGeocodificados']} geocodificados, "
            f"{result['totalNaoEncontrados']} não encontrados → {out_path.name}"
        )


if __name__ == "__main__":
    main()
