# activeContext.md

Track the current work focus, recent changes, next steps, and active decisions.

## Current Focus
- Dashboard redesign for risk analysis workflow is nearly complete: multi-step wizard, progress tracker, agent logs, and export features are implemented.
- Recent focus: Step-by-step UI for risk evaluation, hazard identification, and preventive/contingency actions, with robust handling of nested/complex risk_data.
- All new UI components ensure safe access to keys with spaces/punctuation and provide clear, modern visual feedback.
- No backend changes required for this frontend/dashboard phase.

## Recent Changes
- RiskEvaluation spider chart now normalizes "Impacto Geral" for correct visual scaling.
- HazardIdentification step highlights "Classificação da Necessidade de Tratamento" as a badge.
- PreventiveContingencyActions step (step 9) displays nested lists for "Ações Preventivas" and "Ações de Contingência" per risk, with clear layout and safe key handling.
- Step navigation logic updated to support all new workflow steps.
- Minor bugfixes: scatterplot clustering, UI logic for step navigation, and improved card visuals.
- Merged Initial Report Generation and Report Refinement into a single step labeled Report Refinement.
- Combined Cause Analysis and Damage Assessment into a single step labeled Cause & Consequence Analysis.
- Created a new BowTieView component for visualizing cause and consequence relationships.

## Next Steps
- Conduct full testing of the updated workflow with user inputs.
- Gather and incorporate user feedback to make necessary adjustments.
- Monitor for any UI responsiveness issues and polish as needed.
- Finalize and test all dashboard steps for seamless UX and robust error handling.
- Continue to polish UI/UX, including card backgrounds, badges, and accessibility improvements.
- Prepare for next PRD phase: expanded reporting and deeper backend/frontend integration.

## Important Patterns & Insights
- All nested/complex objects in risk_data are rendered safely and clearly.
- Visual cues (badges, backgrounds) are used to highlight key risk attributes.
- Stepper and state logic ensure the user cannot skip required steps or encounter empty UI states.
