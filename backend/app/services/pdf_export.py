"""
PDF generation service for lecture notes using fpdf2.
Outputs clean, professional, printer-friendly notes containing only:
- Lecture title and subject
- AI-generated English notes (headings and bullet points)
- Footer: 'AI-generated notes from the lecture transcript.'
No transcript, quiz, or source timestamps included.
"""

from typing import Any, List
from fpdf import FPDF


class LectureNotesPDF(FPDF):
    def __init__(self, title: str, subject: str):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.lecture_title = title
        self.lecture_subject = subject

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(110, 110, 110)
        self.cell(self.epw, 10, "AI-generated notes from the lecture transcript.", align="C")


def generate_notes_pdf(lecture_title: str, lecture_subject: str, notes: List[dict[str, Any]]) -> bytes:
    """
    Generates a PDF byte stream containing notes only.
    """
    pdf = LectureNotesPDF(title=lecture_title, subject=lecture_subject)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_margins(left=20, top=20, right=20)
    pdf.add_page()

    # Document Header
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(28, 27, 26)  # Near-black ink (#1C1B1A)
    pdf.cell(pdf.epw, 10, lecture_title, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(70, 70, 70)
    pdf.cell(pdf.epw, 6, f"Subject: {lecture_subject}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Decorative separator line
    pdf.set_draw_color(220, 220, 220)
    pdf.set_line_width(0.3)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + pdf.epw, pdf.get_y())
    pdf.ln(6)

    # Notes sections
    for note in notes:
        heading = note.get("heading") or "Notes"
        bullets = note.get("bullet_points") or note.get("bulletPoints") or []

        # Section Heading
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(31, 58, 95)  # Deep ink blue (#1F3A5F)
        pdf.cell(pdf.epw, 8, heading, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)

        # Bullets
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(35, 35, 35)

        for bullet in bullets:
            # Bullet point indent
            clean_text = f"-  {bullet.strip()}"
            pdf.multi_cell(pdf.epw, 5.5, clean_text, new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1.5)

        pdf.ln(3)

    return bytes(pdf.output())

