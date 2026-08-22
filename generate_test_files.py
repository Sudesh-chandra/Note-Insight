import os
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

os.makedirs("test_fixtures", exist_ok=True)

# -------------------------------------------------------------
# 1. GENERATE 2 TEST IMAGES (.png)
# -------------------------------------------------------------
image_1_text = """CLINICAL PROGRESS NOTE
Patient ID: SYNTH-PAT-104 | Date: 2026-03-14
Provider: Dr. Marina Rios, MD

CHIEF COMPLAINT: 6-month chronic follow-up.

SUBJECTIVE:
58yo male compliant with daily meds. Mild morning headaches.
Mentions he has diabetes and takes Metformin 500mg BID,
but has not checked blood glucose at home recently.

OBJECTIVE:
BP: 142/88 mmHg | HR: 74 bpm | SpO2: 98%
Lungs clear bilaterally, normal heart sounds.

ASSESSMENT & PLAN:
1. Essential Hypertension: Suboptimally controlled.
   Increase Lisinopril to 20mg daily.
2. Diabetes: Continue Metformin 500mg PO BID.
   Ordered fasting glucose and HbA1c panel."""

image_2_text = """PULMONARY CLINICAL ASSESSMENT
Patient ID: SYNTH-PAT-209 | Date: 2026-04-02

HPI:
64yo female with 35 pack-year smoking history presents
with increased productive cough and exertional dyspnea.

CURRENT MEDICATIONS:
- Albuterol HFA 90mcg 2 puffs Q4H PRN
- Prednisone 20mg daily
- Omeprazole 20mg daily (No GI diagnosis in chart)

EXAM: Diffuse expiratory wheezing across all fields.

IMPRESSION & PLAN:
- Acute exacerbation of COPD: Start Azithromycin 250mg
  daily for 5 days. Continue Prednisone taper."""

def create_image_note(filename, text):
    img = Image.new('RGB', (800, 520), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Draw border
    draw.rectangle([(15, 15), (785, 505)], outline=(200, 200, 200), width=2)
    draw.text((35, 35), text, fill=(30, 30, 30), spacing=8)
    img.save(filename)
    print(f"Created image: {filename}")

create_image_note("test_fixtures/test_note_image_1.png", image_1_text)
create_image_note("test_fixtures/test_note_image_2.png", image_2_text)

# -------------------------------------------------------------
# 2. GENERATE 3 TEST PDFS (.pdf)
# -------------------------------------------------------------
pdf_1_lines = [
    "NEPHROLOGY CONSULTATION NOTE",
    "-------------------------------------------------------------------------",
    "Patient ID: SYNTH-REF-3301           Date: 2026-05-10",
    "Attending: Dr. Marina Rios, MD",
    "",
    "SUBJECTIVE:",
    "71yo female referred for declining renal function with mild fatigue.",
    "Denies hematuria, flank pain, or acute edema.",
    "",
    "LABORATORY FINDINGS:",
    "- Serum Creatinine: 1.82 mg/dL (eGFR: 34 mL/min/1.73 m2)",
    "- Hemoglobin: 10.1 g/dL, Ferritin: 18 ng/mL",
    "",
    "IMPRESSION & RECOMMENDATIONS:",
    "1. Chronic Kidney Disease, Stage 3b. Stable. Avoid NSAIDs.",
    "2. Anemia: Labs show iron deficiency. Start Ferrous Sulfate 325mg daily."
]

pdf_2_lines = [
    "HOSPITAL DISCHARGE SUMMARY",
    "=========================================================================",
    "PATIENT ID: SYNTH-DISCH-4812          ADMISSION: 2026-06-01 | DISCHARGE: 2026-06-05",
    "",
    "DISCHARGE DIAGNOSES:",
    "1. Paroxysmal Atrial Fibrillation with rapid ventricular response (resolved)",
    "2. Status post elective total right knee arthroplasty",
    "",
    "HOSPITAL COURSE:",
    "67yo male developed AFib on post-op day 2 (HR 138 bpm).",
    "Successfully rate-controlled with IV Diltiazem, transitioned to Metoprolol.",
    "",
    "DISCHARGE MEDICATIONS:",
    "- Metoprolol Succinate 50mg daily",
    "- Apixaban 5mg BID for AFib stroke prevention and DVT prophylaxis",
    "- Acetaminophen 650mg Q6H PRN for joint pain"
]

pdf_3_lines = [
    "BEHAVIORAL HEALTH CLINICAL VISIT",
    "File No: SYNTH-EDG-902                 Date: 2026-06-18",
    "-------------------------------------------------------------------------",
    "SUBJECTIVE:",
    "42yo female returns for medication check. Reports depressed mood.",
    "Mentions taking Atorvastatin 20mg (no hyperlipidemia diagnosis noted).",
    "",
    "OBJECTIVE / MSE:",
    "Alert, oriented x 3. Affect blunted, psychomotor slowing present.",
    "",
    "ASSESSMENT & PLAN:",
    "- Major Depressive Disorder, Recurrent, Moderate: Increase Sertraline to 100mg.",
    "- Sleep disturbance / Insomnia: Sleep hygiene protocol. Avoid sedatives.",
    "- Follow up in 4 weeks."
]

def create_pdf_note(filename, lines):
    c = canvas.Canvas(filename, pagesize=letter)
    textobject = c.beginText(50, 720)
    textobject.setFont("Helvetica", 11)
    textobject.setLeading(18)
    for line in lines:
        textobject.textLine(line)
    c.drawText(textobject)
    c.save()
    print(f"Created PDF: {filename}")

create_pdf_note("test_fixtures/test_note_pdf_1.pdf", pdf_1_lines)
create_pdf_note("test_fixtures/test_note_pdf_2.pdf", pdf_2_lines)
create_pdf_note("test_fixtures/test_note_pdf_3.pdf", pdf_3_lines)

print("\nAll 5 test fixtures generated successfully!")
