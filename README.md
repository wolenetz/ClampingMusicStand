# **Music Desk for OnStage Keyboard Stand**

## 1. Project Overview

A 3‑D‑printed music desk that can be assembled in multiple configurations (single‑riser, dual‑riser, full/low‑profile, extra‑tall) to hold sheet music or books. It attaches to an "OnStage" brand keyboard stand, which also happens to be holding my Roland Fantom‑G8.  The music desk is built from OnShape FeatureScript geometry, exported as STL, sliced with OrcaSlicer, and printed on a Prusa CORE One.  The repository contains:

- `OnShapeFeatureScript.js` – FeatureScript that generates the parts.
- `PrintingGuide.md` – detailed print‑and‑assembly instructions.

### Key Technologies
- **OnShape** – cloud CAD platform with FeatureScript.
- **FeatureScript** – JavaScript‑like language for parametric geometry.
- **OrcaSlicer** – open‑source slicer (used for layer height, infill, etc.).
- **Prusa CORE One** – the 3‑D printer used for the stand.
- **Git** – version control.
- **Continue** – AI‑assisted development workspace.
- **Claude** – AI assistant for agent-assisted long tasks like overnight reviews.
- **Google Gemini Argon** – AI assistant for prototype generation and development guidance.

### High‑Level Architecture
```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│  OnShapeFeatureScript.js  →  OnShape  →  Export to STL  →  OrcaSlicer  →  Print       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Getting Started

### Prerequisites
| Tool | Minimum Version | Notes |
|------|-----------------|-------|
| **OnShape** | Any account | Use the free tier for scripting; you’ll need a project to host the script. |
| **Node.js** | 14.x or newer | Required if you run local FeatureScript tests (optional). |
| **OrcaSlicer** | Latest release | Download from https://github.com/OrcaSlicer/OrcaSlicer. |
| **Prusa CORE One** | – | Ensure firmware is up‑to‑date. |
| **Git** | 2.x | For cloning and version control. |
| **Continue** | 1.x | Installed as a VS Code extension. |
| **AI Tools** | – | Guidance on setting up local Claude, VSCode, and Continue available in documentation. |

### Installation
1. **Clone the repo**:
   ```bash
   git clone https://github.com/your-org/onstage-stand.git
   cd onstage-stand
   ```
2. **Open in VS Code** and ensure the Continue extension is enabled.
3. **Open the OnShape project** in your OnShape account and link the `OnShapeFeatureScript.js` file.
4. **Export STL** from OnShape for each part (see `PrintingGuide.md` for part list).
5. **Load STL files into OrcaSlicer** and apply the slicer settings from `PrintingGuide.md`.
6. **Print** on a Prusa CORE One.

### Running Tests (Optional)
FeatureScript can be unit‑tested with the OnShape Test Framework. To run tests locally:
```bash
# Install the OnShape CLI (if not already installed)
npm install -g onshape-cli
# Run tests
onshape test run
```
Ensure the `OnShapeFeatureScript.js` file is in the current working directory.

## 3. Project Structure

```
├── .continue/          # Continue workspace
│   └── rules/
│       └── CONTINUE.md
├── PrintingGuide.md            # Print & assembly guide
├── OnShapeFeatureScript.js  # FeatureScript source
└── .git/                # Git metadata
```

### Key Files
- **`OnShapeFeatureScript.js`** – Parametric geometry for the stand.  The script defines parameters such as `part`, `material`, and `orientation`.
- **`PrintingGuide.md`** – Human‑readable instructions for printing and assembling the stand.
- **`.continue/rules/CONTINUE.md`** – AI‑friendly guide for developers.

## 4. Development Workflow

| Step | Description | Tools |
|------|-------------|-------|
| **Branch** | Create a feature branch from `main` | Git |
| **Code** | Edit `OnShapeFeatureScript.js` | VS Code + Continue |
| **Test** | Run FeatureScript unit tests | OnShape CLI |
| **Export** | Generate STL files from OnShape | OnShape UI |
| **Slice** | Load STL into OrcaSlicer | OrcaSlicer |
| **Print** | Print on Prusa CORE One | PrusaSlicer/Print Server |
| **Commit** | Push changes | Git |
| **PR** | Submit pull request | GitHub |

### AI Assistant Usage
- **Claude** can be used for agent-assisted long tasks like overnight reviews of complex FeatureScript changes or print configurations.
- **Google Gemini Argon** can be used for prototype generation and development guidance.

### Coding Conventions
- Use camelCase for variable names.
- Keep functions under 200 lines.
- Document each public function with JSDoc comments.
- Use the `params` object for user‑exposed parameters.

### Testing
- Unit tests should cover geometry creation and parameter validation.
- Integration tests can be manual: export STL, slice, and verify dimensions.

### Build / Deployment
- There is no build step beyond the FeatureScript export; the output is a set of STL files.
- To automate exports, you can use the OnShape API to trigger a script run.

## 5. Key Concepts

- **FeatureScript** – OnShape’s scripting language; similar to JavaScript but with geometry primitives (`box()`, `cylinder()`, `union()`, etc.).
- **Parameters** – Exposed via the `params` object; they allow users to customize dimensions, material, and orientation.
- **Slicer Settings** – Layer height, wall count, infill, brim, and support options are critical for part strength.
- **Modular Riser** – The stand can be configured with a single or dual riser. Parameters `riserType` and `heightProfile` control this.
- **Print Orientation** – The `PrintingGuide.md` specifies orientations for each part to maximize layer adhesion and support usage.

## 6. Common Tasks

### Adding a New Part
1. Define a new function in `OnShapeFeatureScript.js`.
2. Add a `params` entry for the part name.
3. Export the part from OnShape and add it to the slicer.
4. Update the PrintingGuide.md with orientation and support guidance.

### Updating Slicer Settings
1. Open OrcaSlicer.
2. Adjust the global settings in `Print Settings > General`.
3. Save the profile as `OnStage-Stand.prusa` for future use.

### Changing the Stand Height
1. Edit the `heightProfile` parameter in the script.
2. Re‑export the STL.
3. Re‑print with the updated dimensions.

## 7. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|---------------|-----|
| Warped top of Part 1A | Uneven bed temperature | Level the bed, use a brim. |
| Incomplete infill on Part 3B | Low infill setting | Increase infill to 40 % or use a higher layer height. |
| Loose dovetail joints | Incorrect clearance | Re‑measure and adjust the dovetail clearance in the script. |
| Part 4 springs not staying in place | Wrong material | Use PETG as recommended; PLA may not hold the spring tension. |
| Print prints upside‑down | Wrong orientation | Rotate the part 180° in OrcaSlicer as per PrintingGuide.md. |

## 8. AI Development Setup Guidance

### Local Environment Setup
For local development with AI assistance, ensure you have:
- **VSCode** installed with the Continue extension enabled
- **Claude** configured for local use (follow Claude's setup instructions)
- **Google Gemini Argon** available for prototype generation and guidance

### Continue Extension Usage
The Continue extension provides AI-assisted coding capabilities. For this project, it can be used to:
- Generate FeatureScript code snippets
- Provide debugging assistance
- Help with documentation updates

## 8. References
- **OnShape FeatureScript Docs** – https://cad.onshape.com/docs/featureScript.html
- **OrcaSlicer** – https://github.com/OrcaSlicer/OrcaSlicer
- **Prusa CORE One Manual** – https://manual.prusa3d.com/
- **Git Documentation** – https://git-scm.com/doc
- **Continue AI Docs** – https://continue.dev/docs

---

> **NOTE**: Some sections, such as the exact geometry of the riser or the full list of parameters, are derived from the existing `OnShapeFeatureScript.js`. If you encounter discrepancies, review the script or open a PR to update this guide.
