#!/usr/bin/env python3
"""Pixel-level visual diff for UI auditing.

Usage:
    visual_diff.py <baseline.png> <candidate.png> [out_diff.png]

Outputs a similarity score and, if dimensions match, a highlighted diff image.
Dependency: Pillow (already a project dependency).
"""
import sys
import os

try:
    from PIL import Image, ImageChops
except ImportError:
    sys.exit("Pillow is required. Install with: uv pip install Pillow")


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2

    base_path, cand_path = sys.argv[1], sys.argv[2]
    out_path = sys.argv[3] if len(sys.argv) > 3 else None

    base = Image.open(base_path).convert("RGB")
    cand = Image.open(cand_path).convert("RGB")

    if base.size != cand.size:
        print(f"[warn] size mismatch: baseline={base.size} candidate={cand.size}")
        cand = cand.resize(base.size)

    diff = ImageChops.difference(base, cand)
    hist = diff.convert("L").histogram()
    total = sum(hist)
    changed = sum(hist[10:])  # ignore near-identical (anti-aliasing) pixels
    similarity = 1.0 - (changed / total if total else 0.0)

    print(f"baseline : {base_path} {base.size}")
    print(f"candidate: {cand_path}")
    print(f"similarity: {similarity * 100:.2f}%  (pixels differing >threshold: {changed}/{total})")

    if out_path:
        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
        diff.save(out_path)
        print(f"diff image: {out_path}")

    return 0 if similarity >= 0.99 else 1


if __name__ == "__main__":
    raise SystemExit(main())
