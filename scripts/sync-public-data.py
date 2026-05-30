#!/usr/bin/env python3
"""Copia dados gerados para public/data (servidos pelo Vite)."""

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_MAPS = ROOT / "data" / "maps"
SRC_INDEX = ROOT / "data" / "maps-index.json"
DEST = ROOT / "public" / "data"


def main():
    dest_maps = DEST / "maps"
    dest_maps.mkdir(parents=True, exist_ok=True)

    for f in SRC_MAPS.glob("*.json"):
        shutil.copy2(f, dest_maps / f.name)

    shutil.copy2(SRC_INDEX, DEST / "maps-index.json")
    print(f"Dados copiados para {DEST}")


if __name__ == "__main__":
    main()
