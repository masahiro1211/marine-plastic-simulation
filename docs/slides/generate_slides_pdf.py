from pathlib import Path


PAGE_WIDTH = 595
PAGE_HEIGHT = 842
LEFT = 56
TOP = 780
LINE_HEIGHT = 22
TITLE_SIZE = 24
BODY_SIZE = 15


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def split_slides(markdown_text: str) -> list[list[str]]:
    raw_slides = [chunk.strip() for chunk in markdown_text.split("\n---\n") if chunk.strip()]
    slides: list[list[str]] = []
    for raw in raw_slides:
        lines = []
        for line in raw.splitlines():
            stripped = line.strip()
            if not stripped:
                lines.append("")
            elif stripped.startswith("#"):
                lines.append(stripped.lstrip("#").strip())
            elif stripped.startswith("- "):
                lines.append(f"* {stripped[2:].strip()}")
            else:
                lines.append(stripped)
        slides.append(lines)
    return slides


def page_stream(lines: list[str]) -> bytes:
    commands = ["BT", "/F1 24 Tf", f"1 0 0 1 {LEFT} {TOP} Tm"]
    first_line = True
    for index, line in enumerate(lines):
        if index == 1:
            commands.append(f"/F1 {BODY_SIZE} Tf")
        if not first_line:
            commands.append(f"0 -{LINE_HEIGHT} Td")
        commands.append(f"({escape_pdf_text(line)}) Tj")
        first_line = False
    commands.append("ET")
    return "\n".join(commands).encode("ascii", errors="ignore")


def build_pdf(slides: list[list[str]]) -> bytes:
    objects: list[bytes] = []

    def add_object(payload: bytes) -> int:
        objects.append(payload)
        return len(objects)

    font_id = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    page_ids = []
    content_ids = []
    pages_placeholder = add_object(b"<< /Type /Pages /Count 0 /Kids [] >>")

    for slide in slides:
        stream = page_stream(slide)
        content_id = add_object(
            f"<< /Length {len(stream)} >>\nstream\n".encode("ascii")
            + stream
            + b"\nendstream"
        )
        content_ids.append(content_id)
        page_id = add_object(
            (
                f"<< /Type /Page /Parent {pages_placeholder} 0 R "
                f"/MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
                f"/Resources << /Font << /F1 {font_id} 0 R >> >> "
                f"/Contents {content_id} 0 R >>"
            ).encode("ascii")
        )
        page_ids.append(page_id)

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[pages_placeholder - 1] = (
        f"<< /Type /Pages /Count {len(page_ids)} /Kids [{kids}] >>".encode("ascii")
    )
    catalog_id = add_object(f"<< /Type /Catalog /Pages {pages_placeholder} 0 R >>".encode("ascii"))

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n"
            f"startxref\n{xref_start}\n%%EOF\n"
        ).encode("ascii")
    )
    return bytes(pdf)


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    markdown_path = base_dir / "system_overview_slides.md"
    pdf_path = base_dir / "system_overview_slides.pdf"
    slides = split_slides(markdown_path.read_text(encoding="utf-8"))
    pdf_path.write_bytes(build_pdf(slides))


if __name__ == "__main__":
    main()
