# progress.md

Track what works, what’s left to build, current status, known issues, and evolution of project decisions.

## What Works
- Full risk analysis workflow: file upload, real-time streaming, risk table rendering, Word download, post-output adjustments
- Robust backend and frontend separation
- Dashboard steps implemented: Document Ingestion, Information Extraction, Initial Report, Report Refinement, Cause Analysis, Damage Assessment, Risk Evaluation (matrix), Hazard Identification, Preventive/Contingency Actions
- Stepper navigation, agent logs, and progress tracking are functional and robust
- **Component registry mapping for RiskAnalysis and ProtectionMeasuresTable fixed with PascalCase support.**
- **RiskMatrixView scatterplot color accessor and tooltip TypeScript errors fixed.**
- **Streaming upgraded to SSE endpoint; resumeWorkflow infinite loop bug resolved.**
- All new UI components safely handle nested risk_data, spaces/punctuation in keys, and complex objects
- Visual cues (badges, backgrounds) highlight key risk attributes in cards and tables
- Merged steps for better UX, including Report Refinement and Cause & Consequence Analysis.
- Implemented BowTieView for enhanced visualizations.
- Fixed navigation flashes and removed unnecessary components.

## What’s Left
- Document ingestion improvements: show more details about the document ingested (e.g., file name, page count, metadata)
- Add a conclusion element to display RiskAnalysis and ProtectionMeasuresTable together with a download button.
- Conduct comprehensive testing and gather user feedback for refinements.
- Minor refinements: hide chatbot input field and header in dashboard mode, polish card backgrounds and badges, improve accessibility, and address remaining UI/UX edge cases
- Integrate and test all new UI features with backend APIs
- Monitor and polish for UX, accessibility, and bug fixes
- Prepare for expanded reporting (next PRD)

## Current Status
- Dashboard phase nearly complete: frontend redesign and integration underway; all major workflow steps are implemented and connected
- Backend stable; no changes required for this phase
- All core requirements from the initial PRD are implemented and working

## Known Issues
- No critical issues, but monitor for minor UI responsiveness problems.
- **Minor warning:** Function components cannot be given refs (Radix UI/Button). Not blocking, but may require review.

## Decision Log
- Separated backend and frontend codebases for clarity and maintainability
- Adopted LangGraph state management patterns for reliable UI updates
- Chose real-time streaming as the foundation for user engagement
- Initiated dashboard redesign to improve workflow visualization and user experience.
- Maintained backend stability by limiting changes to frontend/UI layer.
- **Standardized component names to PascalCase (RiskAnalysis, ProtectionMeasuresTable) for consistency across registry and backend.**
- **Patched resumeWorkflow to avoid redundant stream connections and infinite loops.**
