import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, LevelFormat, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, Header, Footer,
  TabStopType, TabStopPosition
} from 'docx';
import fs from 'fs';

// ─── Colours ──────────────────────────────────────────────────────────────────
const TEAL   = "0D7377";   // primary headings
const LTEAL  = "14A085";   // secondary headings
const GOLD   = "F0A500";   // hackathon highlight
const LGRAY  = "F4F6F8";   // table-row shade
const DKGRAY = "2C3E50";   // body text
const WHITE  = "FFFFFF";
const HKBG   = "FFF8E7";   // hackathon callout bg

// ─── Borders helper ───────────────────────────────────────────────────────────
const cellBorder = (color="CCCCCC") => {
  const s = { style: BorderStyle.SINGLE, size: 1, color };
  return { top: s, bottom: s, left: s, right: s };
};
const noBorder = () => {
  const n = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: n, bottom: n, left: n, right: n };
};

// ─── Text helpers ─────────────────────────────────────────────────────────────
const body = (text, opts={}) => new Paragraph({
  spacing: { before: 80, after: 80, line: 276 },
  children: [new TextRun({ text, font: "Arial", size: 20, color: DKGRAY, ...opts })]
});

const bodyBold = (label, rest="") => new Paragraph({
  spacing: { before: 80, after: 80, line: 276 },
  children: [
    new TextRun({ text: label, font: "Arial", size: 20, bold: true, color: DKGRAY }),
    new TextRun({ text: rest,  font: "Arial", size: 20, color: DKGRAY })
  ]
});

const bullet = (text, bold=false) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { before: 60, after: 60 },
  children: [new TextRun({ text, font: "Arial", size: 20, bold, color: DKGRAY })]
});

const subbullet = (text) => new Paragraph({
  numbering: { reference: "subbullets", level: 0 },
  spacing: { before: 40, after: 40 },
  children: [new TextRun({ text, font: "Arial", size: 20, color: DKGRAY })]
});

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 120 },
  children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: WHITE })]
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 80 },
  children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: TEAL })]
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 180, after: 60 },
  children: [new TextRun({ text, font: "Arial", size: 22, bold: true, color: LTEAL })]
});

const space = (n=1) => [...Array(n)].map(() => new Paragraph({ children: [new TextRun("")], spacing:{before:60,after:60} }));

// ─── Hackathon callout box (golden highlight) ─────────────────────────────────
const hkCallout = (lines) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [400, 8960],
  rows: [new TableRow({ children: [
    new TableCell({
      borders: noBorder(),
      width: { size: 400, type: WidthType.DXA },
      shading: { fill: GOLD, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 0 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "★", font: "Arial", size: 22, bold: true, color: WHITE })] })]
    }),
    new TableCell({
      borders: noBorder(),
      width: { size: 8960, type: WidthType.DXA },
      shading: { fill: HKBG, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 180, right: 120 },
      children: lines.map(l => new Paragraph({ spacing:{before:40,after:40}, children: [new TextRun({ text: l, font: "Arial", size: 20, color: "7D5A00" })] }))
    })
  ]})]
});

// ─── Two-column table builder ─────────────────────────────────────────────────
const twoColTable = (rows, col1w=3000, col2w=6360) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [col1w, col2w],
  rows: rows.map((r, i) => new TableRow({ children: [
    new TableCell({
      borders: cellBorder("BBBBBB"),
      width: { size: col1w, type: WidthType.DXA },
      shading: { fill: i===0 ? TEAL : (i%2===0 ? LGRAY : WHITE), type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: r[0], font: "Arial", size: 19, bold: i===0, color: i===0 ? WHITE : DKGRAY })] })]
    }),
    new TableCell({
      borders: cellBorder("BBBBBB"),
      width: { size: col2w, type: WidthType.DXA },
      shading: { fill: i===0 ? TEAL : (i%2===0 ? LGRAY : WHITE), type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: r[1], font: "Arial", size: 19, bold: i===0, color: i===0 ? WHITE : DKGRAY })] })]
    })
  ]}))
});

// ─── Three-column table ────────────────────────────────────────────────────────
const threeColTable = (rows, ws=[2000,3160,4200]) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: ws,
  rows: rows.map((r, i) => new TableRow({ children: r.map((cell, ci) => new TableCell({
    borders: cellBorder("BBBBBB"),
    width: { size: ws[ci], type: WidthType.DXA },
    shading: { fill: i===0 ? TEAL : (i%2===0 ? LGRAY : WHITE), type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: cell, font: "Arial", size: 19, bold: i===0, color: i===0 ? WHITE : DKGRAY })] })]
  }))}))
});

// ─── Cover-page title block ────────────────────────────────────────────────────
const coverTitle = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [9360],
  rows: [new TableRow({ children: [new TableCell({
    borders: noBorder(),
    shading: { fill: TEAL, type: ShadingType.CLEAR },
    margins: { top: 400, bottom: 400, left: 400, right: 400 },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "SOFTWARE REQUIREMENTS SPECIFICATION", font: "Arial", size: 32, bold: true, color: WHITE })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing:{before:80}, children: [new TextRun({ text: "CareCompanion: Modular Whole-Eye AI Diagnostic, Education & Healthcare Intelligence System", font: "Arial", size: 24, color: HKBG })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing:{before:160}, children: [new TextRun({ text: "Version 2.0  |  June 2026", font: "Arial", size: 20, color: "D0EAE8" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing:{before:40}, children: [new TextRun({ text: "IEEE Std 830-1998 Compliant", font: "Arial", size: 20, color: "D0EAE8", italics: true })] }),
    ]
  })]})
  ]
});

const metaTable = twoColTable([
  ["Field","Value"],
  ["Document Version","2.0"],
  ["Date","June 2026"],
  ["Status","Active – Hackathon Integration Revision"],
  ["Standard","IEEE Std 830-1998"],
  ["Project","CareCompanion + Databricks/Virtue Foundation IDP Agent"],
  ["Authors","CareCompanion Development Team"],
  ["Reviewers","Databricks Hackathon Jury / Virtue Foundation"],
], 2500, 6860);

// ═════════════════════════════════════════════════════════════════════════════
// DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets",    levels: [{ level:0, format:LevelFormat.BULLET, text:"•",  alignment:AlignmentType.LEFT, style:{paragraph:{indent:{left:720,hanging:360}}} }] },
      { reference: "subbullets", levels: [{ level:0, format:LevelFormat.BULLET, text:"○",  alignment:AlignmentType.LEFT, style:{paragraph:{indent:{left:1080,hanging:360}}} }] },
      { reference: "numbers",    levels: [{ level:0, format:LevelFormat.DECIMAL, text:"%1.", alignment:AlignmentType.LEFT, style:{paragraph:{indent:{left:720,hanging:360}}} }] },
    ]
  },
  styles: {
    default: { document: { run: { font:"Arial", size:20, color:DKGRAY } } },
    paragraphStyles: [
      { id:"Heading1", name:"Heading 1", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ font:"Arial", size:28, bold:true, color:WHITE },
        paragraph:{ spacing:{before:360,after:120}, outlineLevel:0,
          shading:{ fill:TEAL, type:ShadingType.CLEAR },
          indent:{ left:200 }
        }
      },
      { id:"Heading2", name:"Heading 2", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ font:"Arial", size:24, bold:true, color:TEAL },
        paragraph:{ spacing:{before:240,after:80}, outlineLevel:1 }
      },
      { id:"Heading3", name:"Heading 3", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ font:"Arial", size:22, bold:true, color:LTEAL },
        paragraph:{ spacing:{before:180,after:60}, outlineLevel:2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width:12240, height:15840 },
        margin: { top:1080, right:1080, bottom:1080, left:1080 }
      }
    },
    headers: {
      default: new Header({ children: [
        new Paragraph({
          border: { bottom:{ style:BorderStyle.SINGLE, size:6, color:TEAL, space:1 } },
          spacing: { after:60 },
          children: [
            new TextRun({ text:"CareCompanion SRS v2.0  |  IEEE Std 830-1998  |  Hackathon-Integrated Edition", font:"Arial", size:18, color:"888888" }),
          ]
        })
      ]})
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({
          border: { top:{ style:BorderStyle.SINGLE, size:6, color:TEAL, space:1 } },
          spacing: { before:60 },
          tabStops: [{ type:TabStopType.RIGHT, position:9360 }],
          children: [
            new TextRun({ text:"Confidential – CareCompanion Project", font:"Arial", size:18, color:"888888" }),
            new TextRun({ text:"\tPage ", font:"Arial", size:18, color:"888888" }),
            new TextRun({ children:[PageNumber.CURRENT], font:"Arial", size:18, color:"888888" }),
          ]
        })
      ]})
    },
    children: [

// ─────────────────────── COVER ───────────────────────────────────────────────
      coverTitle,
      ...space(2),
      metaTable,
      new Paragraph({ children:[new PageBreak()] }),

// ─────────────────────── REVISION HISTORY ────────────────────────────────────
      h1("Revision History"),
      ...space(1),
      threeColTable([
        ["Version","Date","Description of Changes"],
        ["1.0","March 2026","Initial SRS – Ophthalmic Diagnostic & Education System"],
        ["2.0","June 2026","Integrated Databricks/Virtue Foundation Hackathon: IDP Agent module, agentic orchestration stack (LangGraph / LlamaIndex / CrewAI), RAG pipeline (Databricks / FAISS / LanceDB), MLflow experiment tracking, facility schema extraction, medical-desert detection, geospatial mapping, citation/traceability layer"],
      ],[1400,2000,5960]),
      new Paragraph({ children:[new PageBreak()] }),

// ─────────────────────── SEC 1 ───────────────────────────────────────────────
      h1("1. Introduction"),

      h2("1.1 Purpose"),
      body("This Software Requirements Specification (SRS) establishes the complete architectural, functional, non-functional, and security baseline for the CareCompanion system in its Version 2.0 form. Version 2.0 expands the original ophthalmic diagnostic and education platform by incorporating a fully integrated Intelligent Document Parsing (IDP) Agent subsystem, developed in response to the Databricks/Virtue Foundation Hackathon challenge."),
      ...space(1),
      hkCallout([
        "HACKATHON INTEGRATION — Databricks Challenge: Bridging Medical Deserts",
        "The 2026 Databricks/Virtue Foundation Hackathon challenge introduces an agentic AI intelligence layer designed to reduce the time patients receive lifesaving treatment by 100× through automated healthcare coordination.",
        "CareCompanion v2.0 directly absorbs this problem statement, extending its Intelligent Healthcare Routing module into a full IDP Agent that can reason over unstructured medical facility data, detect infrastructure gaps, and route both patients and doctors to the right location.",
      ]),
      ...space(1),
      body("The combined system serves two cohesive purposes: (1) empower individual patients with AI-driven ophthalmic diagnostics, personalised educational media, and transparent facility recommendations; and (2) serve NGO planners and healthcare coordinators — such as those operating under the Virtue Foundation — with an agentic intelligence layer that maps regional medical capability, exposes medical deserts, and verifies facility claims at scale."),

      h2("1.2 Scope"),
      bodyBold("System Name: ", "CareCompanion: Modular Whole-Eye AI Diagnostic, Education & Healthcare Intelligence System"),
      ...space(1),
      bodyBold("In Scope:"),
      bullet("Analysing uploaded patient symptoms and ophthalmic images (OCT, CFP, Slit-Lamp) using localised AI vision models (RETFound-Green, ResNet-50)."),
      bullet("Generating automated text-based medical reports and personalised educational videos (FLUX.2 + Wan 2.2) from scan results."),
      bullet("Providing a secure, role-based patient portal with a Safe Document Vault (Supabase)."),
      bullet("Facility Capability Mapping: processing and cross-referencing facility data to verify physical infrastructure and personnel adequacy."),
      bullet("Geospatial Emergency Assistance: location-based identification of the nearest verified facilities, steering patients away from medical deserts."),
      bullet("[NEW v2.0] Intelligent Document Parsing (IDP) Agent: extracting and verifying medical facility capabilities from free-form, unstructured text fields (procedure, equipment, capability columns) using a RAG + Agentic workflow."),
      bullet("[NEW v2.0] Medical Desert Detection: identifying regions where critical medical expertise is absent or understated, enabling NGO resource allocation decisions."),
      bullet("[NEW v2.0] Facility Anomaly Detection: flagging suspicious or incomplete capability claims in hospital profiles."),
      bullet("[NEW v2.0] Agentic Planning System: a multi-step reasoning pipeline accessible to non-technical NGO planners via natural language."),
      bullet("[NEW v2.0] Row-level and agentic-step-level Citations: tracing every agent claim back to the specific source data row that supported it, tracked via MLflow."),
      bullet("[NEW v2.0] Geospatial Map Visualisation: rendering a live map of facility capability coverage and gap regions."),
      ...space(1),
      bodyBold("Out of Scope:"),
      bullet("Direct integration with hardware devices for live image capture."),
      bullet("Processing raw patient biometric data through external third-party cloud APIs."),
      bullet("Providing certified medical treatment plans or replacing licensed ophthalmologists."),
      bullet("Tracking individual doctor movements or personal medical credentials beyond facility-level data."),

      h2("1.3 Definitions, Acronyms, and Abbreviations"),
      threeColTable([
        ["Term","Type","Definition"],
        ["SRS","Acronym","Software Requirements Specification"],
        ["AI","Acronym","Artificial Intelligence"],
        ["LLM","Acronym","Large Language Model"],
        ["OCT","Acronym","Optical Coherence Tomography"],
        ["CFP","Acronym","Color Fundus Photography"],
        ["IDP","Acronym","Intelligent Document Parsing"],
        ["RAG","Acronym","Retrieval-Augmented Generation"],
        ["MLflow","Tool","Open-source ML lifecycle and experiment tracking platform (Databricks)"],
        ["FAISS","Tool","Facebook AI Similarity Search – vector similarity library for RAG"],
        ["LanceDB","Tool","Open-source embedded vector database optimised for AI workloads"],
        ["LangGraph","Tool","Graph-based LLM orchestration framework for agentic workflows"],
        ["LlamaIndex","Tool","Data framework for LLM applications, specialised for RAG pipelines"],
        ["CrewAI","Tool","Role-based multi-agent orchestration framework"],
        ["Genie / Text2SQL","Tool","Databricks natural language to SQL query interface"],
        ["Medical Desert","Definition","A geographic region where patients cannot access the critical medical specialties or equipment required to treat their condition within a feasible travel time"],
        ["IDP Agent","Definition","An autonomous AI agent that reads unstructured documents, extracts structured medical facility data, verifies claims, detects anomalies, and reasons over gaps"],
        ["RETFound-Green","Model","Localised AI vision model for retinal scan analysis"],
        ["ResNet-50","Model","Deep learning CNN for anterior segment ophthalmic image classification"],
        ["FLUX.2","Model","Open-source image generation model for medical illustration creation"],
        ["Wan 2.2","Model","Open-source Image-to-Video (I2V) model for educational video animation"],
        ["ComfyUI","Tool","Node-based visual interface for routing FLUX.2 → Wan 2.2 pipeline"],
        ["Pydantic","Tool","Python data validation library used to enforce facility schema integrity"],
        ["RBAC","Acronym","Role-Based Access Control"],
        ["NGO","Acronym","Non-Governmental Organisation"],
        ["VF","Acronym","Virtue Foundation — the partner NGO providing real-world facility datasets"],
      ],[1600,1400,6360]),

      h2("1.4 References"),
      bodyBold("External Standards & Documentation:"),
      bullet("IEEE Recommended Practice for Software Requirements Specifications (IEEE Std 830-1998)."),
      bullet("ABDM (Ayushman Bharat Digital Mission) Sandbox Documentation — healthcare data standards and secure vault architecture."),
      bullet("Databricks/Virtue Foundation Hackathon Brief — Bridging Medical Deserts: Building IDP Agents (2026)."),
      bullet("Virtue Foundation Ghana Dataset & Schema Documentation (official field definitions for facility data extraction)."),
      bullet("MLflow Documentation — Experiment Tracking & Traceability (mlflow.org)."),
      bullet("Official open-source documentation: FLUX.2, Wan 2.2, ComfyUI, RETFound-Green, LangGraph, LlamaIndex, CrewAI, FAISS, LanceDB."),
      bodyBold("Internal Appendices:"),
      bullet("Appendix A — AI Model Output Formats."),
      bullet("Appendix B — Video Generation Pipeline Flow."),
      bullet("Appendix C — User Screens & UI Mockups."),
      bullet("Appendix D — IDP Agent Architecture & Agentic Reasoning Flow [NEW v2.0]."),
      bullet("Appendix E — Facility Schema: All Columns and Definitions [NEW v2.0]."),
      bullet("Appendix F — MLflow Citation Traceability Schema [NEW v2.0]."),

      h2("1.5 Overview"),
      body("Section 2 gives a full product overview, user characteristics, constraints, and assumptions. Section 3 presents specific functional requirements (use cases), performance requirements, design constraints, and external interface requirements — including all new IDP Agent use cases added in v2.0. Section 4 outlines future extensions. Section 5 contains appendices."),

      new Paragraph({ children:[new PageBreak()] }),

// ─────────────────────── SEC 2 ───────────────────────────────────────────────
      h1("2. Overall Description"),

      h2("2.1 Product Perspective"),
      body("CareCompanion v2.0 is a web-based, multi-subsystem platform composed of two tightly integrated layers:"),
      bullet("Patient Intelligence Layer: The original ophthalmic diagnostic and educational interface — a React/Flask application where patients upload scans, receive AI-generated reports and videos, chat with the AI Director, and manage their secure document vault."),
      bullet("Healthcare Coordination Intelligence Layer [NEW v2.0]: An agentic IDP pipeline — directly inspired by the Databricks/Virtue Foundation Hackathon problem statement — that ingests unstructured facility data, extracts structured capability records, detects medical deserts and anomalies, and presents actionable coordination recommendations to NGO planners."),
      ...space(1),
      body("All heavy AI processing (vision models, video generation, IDP agent reasoning loops) executes on a secure local backend. Only sanitised, non-identifying clinical text is forwarded to external LLM APIs (Groq / Llama 3.1). The system is accessible via standard web browsers on any platform."),

      h2("2.2 Product Functions"),
      ...space(1),
      threeColTable([
        ["Module","Use Case","Description"],
        ["Diagnostic Functions","Retinal Analysis","Back-of-eye scan analysis (OCT, CFP) via localised RETFound-Green model."],
        ["Diagnostic Functions","Anterior Segment Analysis","Front-of-eye scan analysis (Slit-Lamp) via custom ResNet-50."],
        ["Educational & Chat","AI Director Chat","LLM (Llama 3.1 via Groq) — educational responses and YouTube video link generation."],
        ["Educational & Chat","Generative Media Creation","Text-to-video pipeline: FLUX.2 illustrations → Wan 2.2 animation."],
        ["Data Management","Secure Document Vault","Encrypted patient record storage (Supabase), RBAC-enforced."],
        ["Data Management","Document Parsing","PDF text extraction (PyPDF2) for AI analysis."],
        ["Utility / Portal","Appointment Management","Backend scheduling and sorting of patient appointments."],
        ["Utility / Portal","Real-Time Interactions","WebSocket (SocketIO) for live UI feedback."],
        ["[NEW] IDP Agent","Unstructured Feature Extraction","Extract procedure, equipment, capability fields from free-form hospital notes using RAG + LLM agent."],
        ["[NEW] IDP Agent","Intelligent Synthesis","Merge unstructured insights with structured facility schemas for a unified regional capability view."],
        ["[NEW] IDP Agent","Medical Desert Detection","Identify geographic regions where required specialties or equipment are absent."],
        ["[NEW] IDP Agent","Facility Anomaly Detection","Flag suspicious capability claims (e.g., surgery listed without OR equipment)."],
        ["[NEW] IDP Agent","Agentic Planning System","Natural language interface for NGO planners to query facility data and receive step-by-step action plans."],
        ["[NEW] IDP Agent","Geospatial Map Visualisation","Interactive map rendering of facility coverage, capability gaps, and medical deserts."],
        ["[NEW] IDP Agent","Citation & Traceability","Row-level and agentic-step-level citations logged via MLflow for full audit trail."],
      ],[1800,2200,5360]),

      h2("2.3 User Characteristics"),
      bodyBold("Patient (Primary User): "),
      body("Requires basic computer literacy (web browser, file upload). No prior medical knowledge assumed — the system translates all clinical terminology into plain language."),
      bodyBold("Administrator / Clinic Staff: "),
      body("Familiar with standard ophthalmic imaging types and appointment scheduling workflows. Accesses the Streamlit Admin Dashboard."),
      bodyBold("[NEW v2.0] NGO Planner / Healthcare Coordinator: "),
      body("May be non-technical, operating across a wide range of ages and experience levels. The agentic planning system must be accessible via natural language queries without requiring knowledge of SQL or AI tooling. This user class is drawn from organisations such as the Virtue Foundation and operates in low-resource settings."),

      h2("2.4 Principal Actors"),
      bullet("Patient (Primary User) — uploads scans, uses AI Director, watches educational videos, manages document vault."),
      bullet("Administrator / Clinic Staff — monitors AI pipeline and user accounts via Streamlit Admin Dashboard."),
      bullet("System (AI Pipeline & Backend) — executes diagnostic models, media generation, PDF parsing, WebSocket updates."),
      bullet("[NEW v2.0] NGO Healthcare Coordinator — queries the IDP Agent in natural language to identify medical deserts, verify facility capabilities, and allocate resources."),
      bullet("[NEW v2.0] IDP Agent (Autonomous) — reads facility documents, extracts structured records, detects anomalies, reasons over coverage gaps, and generates cited recommendations."),

      h2("2.5 General Constraints"),
      bullet("Internet Requirement: Stable connection required for patient portal, AI chat, Supabase, and the IDP Agent map visualisation layer."),
      bullet("Hardware Dependencies: Backend GPU required for FLUX.2, Wan 2.2, RETFound-Green, and for running local LLM inference in the IDP pipeline."),
      bullet("Multi-User Architecture: Concurrent access requires strict RBAC to isolate patient data and NGO coordinator sessions."),
      bullet("Medical Data Privacy: All patient scans, PDFs, and reports must be encrypted in transit (HTTPS/WSS) and at rest (Supabase)."),
      bullet("[NEW v2.0] Dataset Compatibility: The IDP Agent is scoped to handle small, high-impact medical datasets compatible with the Databricks Free Edition environment."),
      bullet("[NEW v2.0] Schema Compliance: All extracted facility records must conform to the Virtue Foundation / Pydantic field definitions for organisation, facility, and NGO entity types."),

      h2("2.6 Assumptions and Dependencies"),
      bullet("Cloud & API Dependencies: Supabase (auth/storage), Groq API (Llama 3.1 LLM chat), YouTube public search URL format."),
      bullet("Hardware Assumption: Deployment server has adequate GPU VRAM for all localised AI models."),
      bullet("Data Input Assumption: Uploaded scans are of sufficient resolution for AI model accuracy."),
      bullet("[NEW v2.0] Databricks Environment: The IDP Agent components are assumed to run within Databricks Free Edition, maintaining compatibility with its resource constraints."),
      bullet("[NEW v2.0] Virtue Foundation Dataset: Real-world facility reports and medical notes from Ghana (single-country scope) are provided by the VF and are assumed to be representative of the unstructured data the IDP Agent will process."),
      bullet("[NEW v2.0] MLflow Availability: An MLflow tracking server (local or Databricks-managed) is assumed to be running to log all agent reasoning steps and citations."),

      new Paragraph({ children:[new PageBreak()] }),

// ─────────────────────── SEC 3 ───────────────────────────────────────────────
      h1("3. Specific Requirements"),

      h2("3.1 Functional Requirements"),
      body("Requirements are expressed as IEEE-style use cases. Use cases UC-01 through UC-04 are retained from v1.0. UC-05 through UC-09 are new in v2.0 and cover the IDP Agent subsystem."),
      ...space(1),

      // ── UC-01 ──
      h3("UC-01: Upload and Parse a Medical Document"),
      twoColTable([
        ["Field","Detail"],
        ["Primary Actor","Patient"],
        ["Pre-condition","User is authenticated; active internet connection present."],
        ["Main Scenario","1. User navigates to the Safe Document Vault.\n2. User selects a PDF medical document to upload.\n3. System securely transfers file to Supabase cloud storage.\n4. System extracts text using PyPDF2.\n5. System stores document metadata and extracted text in the user's secure database record.\n6. System confirms upload and displays the document in the vault."],
        ["Alternate — 3a","File is not a valid PDF or is corrupted → system aborts and displays an error message."],
        ["Alternate — 3b","Supabase connection failure → system alerts the user and prompts retry."],
      ]),
      ...space(1),

      // ── UC-02 ──
      h3("UC-02: Generate Diagnostic Report from Eye Scan"),
      twoColTable([
        ["Field","Detail"],
        ["Primary Actor","Patient / Administrator"],
        ["Pre-condition","User authenticated; RETFound-Green / ResNet-50 models active on GPU backend."],
        ["Main Scenario","1. User uploads ophthalmic image (OCT, CFP, Slit-Lamp) and optional text symptoms.\n2. Backend routes image to the appropriate localised vision model.\n3. Vision model extracts raw diagnostic data.\n4. LLM (Director) synthesises a text-based medical report.\n5. Report saved to Supabase and displayed in under 15 seconds."],
        ["Alternate — 2a","Image is blurry/unsupported → abort and prompt re-upload."],
        ["Alternate — 4a","GPU server timeout → queue task; notify user of delay."],
      ]),
      ...space(1),

      // ── UC-03 ──
      h3("UC-03: Interactive Chat and Video Link Generation (The Director)"),
      twoColTable([
        ["Field","Detail"],
        ["Primary Actor","Patient"],
        ["Pre-condition","User authenticated; Groq API reachable."],
        ["Main Scenario","1. User types a question in the AI Chat interface.\n2. System sends query and clinical context to Llama 3.1 via Groq API.\n3. LLM formulates an educational response.\n4. LLM dynamically constructs YouTube search links from identified clinical terms.\n5. System displays response and links in real-time."],
        ["Alternate — 2a","Groq API unreachable → system returns: \"I'm having trouble connecting to the Model.\""],
      ]),
      ...space(1),

      // ── UC-04 ──
      h3("UC-04: Generative Educational Video Creation"),
      twoColTable([
        ["Field","Detail"],
        ["Primary Actor","System (Background) / Patient"],
        ["Pre-condition","Text medical report generated (UC-02); FLUX.2 and Wan 2.2 active."],
        ["Main Scenario","1. System triggers video pipeline once report is finalised.\n2. LLM writes a step-by-step visual script (3–5 scenes).\n3. FLUX.2 generates 1024×1024 medical illustrations per scene.\n4. Wan 2.2 (via ComfyUI) animates each image into a 4–5 sec clip at 24 FPS.\n5. System compiles clips with AI voiceover into final MP4.\n6. MP4 saved to Supabase vault.\n7. Real-time notification sent to patient portal."],
        ["Alternate — 4a","VRAM exhaustion → gracefully abort video task; text report remains accessible; admin log created."],
      ]),
      ...space(1),

      // ── UC-05 (NEW) ──
      hkCallout(["NEW — UC-05 through UC-09 are introduced in v2.0 as part of the Databricks/Virtue Foundation Hackathon integration."]),
      ...space(1),

      h3("UC-05: IDP Agent — Unstructured Feature Extraction from Facility Documents"),
      twoColTable([
        ["Field","Detail"],
        ["Primary Actor","IDP Agent (Autonomous) / NGO Coordinator"],
        ["Pre-condition","Virtue Foundation facility dataset (Ghana) loaded into vector store (FAISS / LanceDB). Agentic orchestrator (LangGraph / LlamaIndex / CrewAI) initialised."],
        ["Main Scenario","1. NGO Coordinator submits a natural language query (e.g., \"Which facilities in Accra perform cataract surgery?\").\n2. IDP Agent decomposes the query into sub-tasks via the agentic planner.\n3. Agent retrieves semantically relevant facility text chunks from the RAG vector store.\n4. LLM extracts structured fields: procedures (list[str]), equipment (list[str]), capability (list[str]), specialties (list[str]) per the Virtue Foundation Pydantic schema.\n5. Agent returns structured records with row-level citations.\n6. MLflow logs each reasoning step with inputs, outputs, and source data rows."],
        ["Alternate — 3a","Insufficient data in vector store → agent reports missing data and suggests schema gap."],
        ["Alternate — 4a","LLM extraction confidence below threshold → agent flags record for human review."],
      ]),
      ...space(1),

      // ── UC-06 (NEW) ──
      h3("UC-06: IDP Agent — Intelligent Synthesis of Structured and Unstructured Facility Data"),
      twoColTable([
        ["Field","Detail"],
        ["Primary Actor","IDP Agent"],
        ["Pre-condition","UC-05 extraction complete for a set of facilities; structured base schema (contact, address, facilityTypeId, operatorTypeId etc.) available."],
        ["Main Scenario","1. Agent merges unstructured extraction outputs (procedures, equipment, capabilities) with structured base fields.\n2. Agent resolves conflicts (e.g., procedure mentioned in text but not in structured schema) using a confidence scoring heuristic.\n3. System outputs a unified, validated facility profile conforming to the Virtue Foundation full schema.\n4. Synthesis results are stored and made queryable via Genie (Text2SQL)."],
        ["Alternate — 2a","Unresolvable conflict detected → agent flags discrepancy for NGO Coordinator review."],
      ]),
      ...space(1),

      // ── UC-07 (NEW) ──
      h3("UC-07: Medical Desert Detection and Regional Gap Mapping"),
      twoColTable([
        ["Field","Detail"],
        ["Primary Actor","IDP Agent / NGO Coordinator"],
        ["Pre-condition","Synthesised facility profiles (UC-06) available for a target region."],
        ["Main Scenario","1. Agent analyses the synthesised profiles to map available specialties and equipment per geographic region.\n2. Agent compares available capability against WHO/VF-defined minimum care thresholds.\n3. Agent identifies and labels regions as \"medical deserts\" where critical specialties (e.g., ophthalmology, cardiology, emergency medicine) are absent or understated.\n4. System generates a structured gap report: region, missing specialties, affected population estimate, nearest available facility.\n5. Report rendered as an interactive geospatial map in the frontend."],
        ["Alternate — 5a","Map tile service unavailable → system degrades to table/card view of gap data."],
      ]),
      ...space(1),

      // ── UC-08 (NEW) ──
      h3("UC-08: Facility Anomaly Detection"),
      twoColTable([
        ["Field","Detail"],
        ["Primary Actor","IDP Agent"],
        ["Pre-condition","Synthesised facility profiles (UC-06) available."],
        ["Main Scenario","1. Agent applies rule-based and LLM-assisted anomaly checks across all facility profiles.\n2. Rules include: surgery capability listed without an operating room or anaesthesiology equipment; ICU listed without piped oxygen; NICU listed without neonatal ventilators; specialist count of 0 with advanced procedures claimed.\n3. Agent flags each anomaly with a severity level (Warning / Critical) and the specific conflicting fields.\n4. Anomalies are included in the synthesised profile output and surfaced to the NGO Coordinator dashboard.\n5. MLflow records the rule chain that triggered each anomaly flag."],
        ["Alternate — 1a","Agent cannot resolve ambiguity from text alone → flags as \"Requires Manual Verification\"."],
      ]),
      ...space(1),

      // ── UC-09 (NEW) ──
      h3("UC-09: Agentic Planning System for NGO Coordinators"),
      twoColTable([
        ["Field","Detail"],
        ["Primary Actor","NGO Healthcare Coordinator"],
        ["Pre-condition","IDP Agent subsystem fully initialised; synthesised profiles and gap reports available."],
        ["Main Scenario","1. NGO Coordinator opens the Planning interface and enters a natural language request (e.g., \"I need to deploy two ophthalmologists in northern Ghana by June — where should they go?\").\n2. Agentic planner (LangGraph) decomposes the request into: (a) query medical desert map for ophthalmology gaps; (b) retrieve nearest facilities with partial capability; (c) estimate patient impact of deployment.\n3. Each sub-task is executed sequentially; agent outputs a step-by-step reasoning chain.\n4. System presents a final recommended deployment plan with supporting citations (row-level from facility data).\n5. Plan can be exported as a PDF summary report."],
        ["Alternate — 2a","Agent lacks sufficient data for a sub-task → transparently reports data gap and provides best-effort partial plan."],
      ]),
      ...space(1),

      // ── Functional Req table ──
      h2("3.1.1 Consolidated Functional Requirements"),
      threeColTable([
        ["Req. ID","Requirement","Source"],
        ["REQ-01","The system shall analyse uploaded ophthalmic images (OCT, CFP, Slit-Lamp) using localised AI vision models and return a text-based diagnostic report in under 15 seconds.","UC-02"],
        ["REQ-02","The system shall generate personalised educational videos from text reports via FLUX.2 and Wan 2.2 asynchronously without blocking the patient UI.","UC-04"],
        ["REQ-03","The system shall provide an AI chat interface (The Director) powered by Llama 3.1 via Groq API, returning educational responses and YouTube search links.","UC-03"],
        ["REQ-04","The system shall store all patient records in an encrypted Supabase vault with RBAC-enforced access control.","UC-01"],
        ["REQ-05","The system shall map clinical conditions to required facility equipment and specialties for patient routing.","UC-02, UC-09"],
        ["REQ-06","The system shall identify the nearest verified capable facilities and present recommendations with plain-language justifications.","UC-09"],
        ["REQ-07 [NEW]","The IDP Agent shall extract procedure, equipment, capability, and specialty fields from free-form facility text using a RAG pipeline (FAISS / LanceDB) and LLM reasoning.","UC-05"],
        ["REQ-08 [NEW]","The IDP Agent shall merge unstructured extraction outputs with structured facility schema fields, producing a unified Pydantic-validated facility profile.","UC-06"],
        ["REQ-09 [NEW]","The system shall detect and label geographic regions as medical deserts where critical medical specialties or equipment are absent, relative to WHO/VF thresholds.","UC-07"],
        ["REQ-10 [NEW]","The IDP Agent shall flag facility profile anomalies (e.g., surgery claimed without operating room) with severity levels (Warning/Critical) and conflicting field citations.","UC-08"],
        ["REQ-11 [NEW]","The system shall provide a natural language agentic planning interface for NGO coordinators, producing step-by-step deployment or resource allocation plans with supporting data citations.","UC-09"],
        ["REQ-12 [NEW]","Every IDP Agent claim shall include a row-level citation identifying the source facility record and field that supported it.","UC-05, UC-08, UC-09"],
        ["REQ-13 [NEW]","All agent reasoning steps shall be logged to MLflow, capturing inputs, outputs, tool calls, and source citations for each step in the reasoning chain.","UC-05–UC-09"],
        ["REQ-14 [NEW]","The system shall render a geospatial map visualising facility capability coverage, identified medical deserts, and anomaly-flagged facilities.","UC-07"],
        ["REQ-15 [NEW]","The agentic planning interface shall be operable by non-technical NGO planners across all age groups using plain natural language — no SQL or programming knowledge required.","UC-09"],
      ],[1600,5400,2360]),

      h2("3.2 Performance Requirements"),
      bullet("Hardware Capabilities: Backend GPU must support concurrent execution of FLUX.2, Wan 2.2, RETFound-Green, and IDP Agent LLM inference without VRAM overflow."),
      bullet("Response Times: 90% of standard UI interactions and Director chat responses shall complete within 2–3 seconds."),
      bullet("Diagnostic Speed: Automated text-based medical report shall be generated and displayed to the user in under 15 seconds (REQ-01)."),
      bullet("Background Processing: Video generation and IDP Agent batch extraction tasks shall run asynchronously; the UI shall never block."),
      bullet("AI Vision Accuracy: Custom vision models (ResNet-50) shall maintain a minimum 85% classification accuracy on patient scans."),
      bullet("[NEW v2.0] IDP Extraction Accuracy: The IDP Agent shall achieve ≥80% field-level extraction accuracy against the Virtue Foundation schema, measured via MLflow tracked evaluations."),
      bullet("[NEW v2.0] Agent Latency: Single-facility IDP extraction (UC-05) shall complete within 10 seconds; a full regional gap report (UC-07) covering up to 500 facilities shall complete within 5 minutes."),
      bullet("[NEW v2.0] Citation Coverage: ≥95% of agent-generated claims shall be accompanied by a valid row-level citation traceable to a source facility record."),

      h2("3.3 Design Constraints"),
      bodyBold("Security & Data Privacy: "),
      body("All patient data (scans, PDFs, reports) shall be encrypted in transit (HTTPS/WSS) and at rest (Supabase). RBAC enforced throughout. Raw biometric data shall never be transmitted to external APIs."),
      bodyBold("Fault Tolerance: "),
      body("GPU crashes, VRAM exhaustion, or dropped WebSocket connections shall not corrupt patient records. The system shall gracefully abort background tasks and log errors for administrator review."),
      bodyBold("Architectural Constraint (Local Processing): "),
      body("Vision diagnostics (RETFound-Green, ResNet-50) and media generation (FLUX.2, Wan 2.2) must run on the local backend. Only sanitised clinical text may be forwarded to external LLMs (Groq)."),
      bodyBold("[NEW v2.0] IDP Agent Schema Compliance: "),
      body("All extracted facility records shall conform to the Virtue Foundation Pydantic schema. Non-conforming records shall be flagged rather than silently dropped."),
      bodyBold("[NEW v2.0] Databricks Free Edition Compatibility: "),
      body("The IDP Agent pipeline (RAG, vector store, agentic orchestration) shall be designed to run within the resource limits of Databricks Free Edition for the hackathon prototype phase."),
      bodyBold("[NEW v2.0] MLflow Traceability: "),
      body("Every agent reasoning loop shall emit MLflow run entries capturing: input documents, sub-task prompts, LLM responses, tool outputs, and citation indices. This enables step-level audit and reproducibility."),

      h2("3.4 External Interface Requirements"),
      h3("3.4.1 Patient Portal (React Frontend)"),
      bullet("Persistent navigation (sidebar/navbar) across vault, chat, diagnostic, and facility recommendation views."),
      bullet("Safe Document Vault with upload controls and real-time processing status indicators."),
      bullet("The Director Chat with sequential chat history and clickable YouTube links."),
      bullet("Diagnostic & Media Viewer for text reports and AI-generated educational videos."),
      ...space(1),
      h3("3.4.2 NGO Coordinator Interface [NEW v2.0]"),
      bullet("Natural language query box for IDP Agent interaction."),
      bullet("Step-by-step agentic reasoning display (chain-of-thought visible to user)."),
      bullet("Geospatial map panel rendering facility capability heatmap, medical desert zones (red), anomaly-flagged facilities (amber), and verified capable facilities (green)."),
      bullet("Exportable gap/deployment report (PDF)."),
      bullet("Citation panel: for each agent claim, clicking the citation highlights the source facility row and field."),
      ...space(1),
      h3("3.4.3 Backend & Agentic Architecture [NEW v2.0]"),
      bullet("Multi-Agent Reasoning Engine: LangGraph (primary orchestrator) with optional CrewAI for role-based parallel sub-tasks and LlamaIndex for RAG document indexing."),
      bullet("Vector Stores: FAISS (in-memory, fast retrieval) or LanceDB (persistent, production-ready) for facility document embeddings."),
      bullet("Text2SQL (Genie): Natural language interface bridging coordinator queries to structured Databricks SQL facility tables."),
      bullet("MLflow: Tracks all agent runs, logs sub-task inputs/outputs, records citation indices, and stores evaluation metrics for IDP accuracy benchmarking."),
      bullet("Pydantic Models: Enforce schema validation on all extracted facility records before persistence."),
      ...space(1),
      h3("3.4.4 Streamlit Admin Dashboard"),
      bullet("Monitors AI pipeline status (video generation queue, IDP agent batch jobs)."),
      bullet("Manages user accounts and RBAC assignments."),
      bullet("[NEW v2.0] Displays MLflow run history and IDP agent evaluation scores."),

      new Paragraph({ children:[new PageBreak()] }),

// ─────────────────────── SEC 4 ───────────────────────────────────────────────
      h1("4. Future Extensions"),
      bullet("Full Diagnostic Module Integration: Activate RETFound-Green retinal analysis and ResNet-50 anterior segment classification as production features (currently in validation)."),
      bullet("Live Hardware Integration: Direct DICOM feed from OCT/Slit-Lamp devices to eliminate manual image upload."),
      bullet("Multi-Country IDP Dataset Expansion: Extend the Virtue Foundation IDP Agent beyond Ghana to additional countries, incorporating country-specific schema variants."),
      bullet("Real-Time Doctor-Hospital Matching: Extend the agentic planner to actively connect available doctors in the VF network to verified facilities with capability gaps — directly fulfilling the hackathon's 100× treatment-time-reduction goal."),
      bullet("Federated Learning: Allow multiple clinic deployments of the vision models to collaboratively improve model accuracy without sharing raw patient data."),
      bullet("ABDM / HL7 FHIR Integration: Connect the patient vault to national health record standards for interoperability."),
      bullet("Voice Interface for NGO Planners: A speech-to-text input layer for the agentic planning system to support coordinators in field conditions without keyboard access."),

      new Paragraph({ children:[new PageBreak()] }),

// ─────────────────────── SEC 5 ───────────────────────────────────────────────
      h1("5. Appendices"),

      h2("Appendix A — AI Model Output Formats"),
      h3("A.1 Standard Medical Report Summary (LLM JSON)"),
      body('{ "status": "success", "data": { "title": "Summary of Comprehensive Eye Exam", "bullet_points": [ "Patient exhibits mild signs of dry eye syndrome.", "Retinal scan shows no immediate abnormalities.", "Recommended: prescribed artificial tears twice daily." ] } }'),
      ...space(1),
      h3("A.2 Director Chat & Video Recommendations"),
      body("VIDEO: [Clear Title] | [Channel Name] | https://www.youtube.com/results?search_query=[clinical+terms]"),

      h2("Appendix B — Video Generation Pipeline"),
      twoColTable([
        ["Phase","Details"],
        ["Phase 1 – Scripting (LLM)","LLM parses patient report; extracts 3–5 key visual scenes."],
        ["Phase 2 – Image Generation (FLUX.2)","Generates static 1024×1024 medical illustrations per scene."],
        ["Phase 3 – Animation (Wan 2.2)","Each image animated to 4–5 sec clip at 24 FPS via ComfyUI."],
        ["Phase 4 – Compilation","Clips + AI voiceover stitched into final .mp4; uploaded to Supabase."],
      ]),

      h2("Appendix C — User Screens"),
      bullet("Screen C.1 — Authentication: secure login with email/password and guest mode."),
      bullet("Screen C.2 — Patient Portal Dashboard: side navigation + quick-action upload and chat buttons."),
      bullet("Screen C.3 — The Director Chat: split-screen chat view with history and health check logs."),
      bullet("[NEW] Screen C.4 — NGO Coordinator Planning Interface: natural language query box, agentic reasoning chain view, citation panel."),
      bullet("[NEW] Screen C.5 — Geospatial Facility Map: interactive map with colour-coded facility layers."),

      h2("Appendix D — IDP Agent Architecture [NEW v2.0]"),
      hkCallout([
        "The IDP Agent implements the Databricks Hackathon technical stack recommendation:",
        "Orchestration: LangGraph (primary) | LlamaIndex (RAG) | CrewAI (parallel role agents)",
        "ML Lifecycle: MLflow for experiment tracking, sub-task logging, and citation traceability",
        "Vector Store: FAISS (prototype) / LanceDB (production)",
        "Text2SQL: Databricks Genie",
        "Schema Enforcement: Pydantic models per Virtue Foundation schema specification",
      ]),
      ...space(1),
      body("Agent Reasoning Flow:"),
      bullet("Step 1 — Ingest: load raw facility documents into LlamaIndex vector index (FAISS/LanceDB)."),
      bullet("Step 2 — Retrieve: semantic search retrieves top-k relevant text chunks per query."),
      bullet("Step 3 — Extract: LLM extracts structured fields (procedure, equipment, capability, specialty) per Pydantic schema."),
      bullet("Step 4 — Synthesise: merge with structured base fields; resolve conflicts via confidence heuristics."),
      bullet("Step 5 — Reason: LangGraph orchestrator applies anomaly detection rules and gap analysis logic."),
      bullet("Step 6 — Cite: every output claim tagged with source document row ID and field name."),
      bullet("Step 7 — Log: MLflow run records all step I/O, tool calls, and citation indices."),
      bullet("Step 8 — Output: structured facility profiles, gap report, anomaly flags, and deployment recommendations presented to NGO Coordinator."),

      h2("Appendix E — Virtue Foundation Facility Schema Summary [NEW v2.0]"),
      body("Full schema definitions are provided in the Virtue Foundation Schema Documentation. Key field groups:"),
      threeColTable([
        ["Field Group","Key Fields","Notes"],
        ["Organisation Extraction","ngos, facilities, other_organizations","Classify entity type before applying sub-schema"],
        ["Contact & Web Presence","name, phone_numbers, email, officialWebsite, social links","E164 phone format required"],
        ["Address","address_line1–3, city, stateOrRegion, country, countryCode","ISO alpha-2 country code required when country known"],
        ["Facility-Specific","facilityTypeId, operatorTypeId, affiliationTypeIds, numberDoctors, capacity, area","Enum validation enforced by Pydantic"],
        ["Medical Specialties","specialties (list[str])","Case-sensitive exact match from specialty hierarchy"],
        ["Facility Facts (Free-form)","procedure (list[str]), equipment (list[str]), capability (list[str])","Primary extraction target for IDP Agent — declarative statements with quantities"],
        ["NGO-Specific","countries, missionStatement, missionStatementLink, organizationDescription","ISO alpha-2 country list"],
      ],[2200,3200,3960]),

      h2("Appendix F — MLflow Citation Traceability Schema [NEW v2.0]"),
      body("Each MLflow run for an IDP Agent reasoning chain shall log the following parameters and artefacts:"),
      twoColTable([
        ["MLflow Field","Description"],
        ["run_id","Unique identifier for this agent invocation"],
        ["step_index","Sequential index of reasoning step within run"],
        ["step_type","Enum: retrieve | extract | synthesise | anomaly_check | gap_analysis | plan"],
        ["input_query","Natural language query or sub-task prompt for this step"],
        ["retrieved_row_ids","List of source facility record IDs retrieved from vector store"],
        ["llm_output","Raw LLM response for this step"],
        ["structured_output","Pydantic-validated extraction or reasoning output"],
        ["citation_map","Dict mapping each output claim to its source row_id and field_name"],
        ["anomaly_flags","List of anomaly objects: {facility_id, severity, conflicting_fields}"],
        ["eval_metrics","Precision/recall vs. ground-truth schema labels (if eval set available)"],
        ["timestamp","ISO 8601 timestamp of step execution"],
      ]),

      h2("Appendix G — Technology Stack Summary"),
      threeColTable([
        ["Layer","Component","Version / Notes"],
        ["Patient Frontend","React","Latest stable; responsive, mobile-compatible"],
        ["Backend API","Flask + Python","REST API + SocketIO for real-time updates"],
        ["Admin Dashboard","Streamlit","Quick pipeline monitoring UI"],
        ["Vision AI","RETFound-Green","Retinal analysis; local GPU execution"],
        ["Vision AI","ResNet-50","Anterior segment analysis; ≥85% accuracy target"],
        ["Image Generation","FLUX.2 (open-source)","1024×1024 medical illustrations"],
        ["Video Animation","Wan 2.2 5B (open-source)","4–5 sec clips at 24 FPS via ComfyUI"],
        ["Video Editing","FFmpeg + Python","Clip compilation and voiceover mixing"],
        ["LLM (Chat)","Llama 3.1 via Groq API","Director chat and report synthesis"],
        ["Database / Auth","Supabase","Cloud PostgreSQL + encrypted storage + RBAC"],
        ["PDF Parsing","PyPDF2","Document text extraction"],
        ["[NEW] IDP Orchestration","LangGraph","Primary agentic workflow graph"],
        ["[NEW] IDP Orchestration","LlamaIndex","RAG document indexing and retrieval"],
        ["[NEW] IDP Orchestration","CrewAI","Parallel role-based sub-agent tasks"],
        ["[NEW] Vector Store","FAISS / LanceDB","Semantic similarity retrieval for facility docs"],
        ["[NEW] ML Lifecycle","MLflow","Experiment tracking, citation logging, eval metrics"],
        ["[NEW] Text2SQL","Databricks Genie","NL → SQL for structured facility data queries"],
        ["[NEW] Schema Validation","Pydantic","Enforce Virtue Foundation facility schema"],
        ["[NEW] Map Visualisation","Leaflet.js / Folium","Interactive geospatial facility and gap maps"],
      ],[2200,2600,4560]),

    ]
  }]
});

const destPath = "D:\\CareCompanion\\frontend\\carecompanion\\CareCompanion_SRS_v2.0_IEEE.docx";

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(destPath, buf);
  console.log(`Done! Document saved to: ${destPath}`);
});