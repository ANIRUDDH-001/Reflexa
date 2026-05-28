# Phase 1 — Product Definition, UX Flows, and Demo Story

## Objective

Lock the product experience before implementation becomes expensive to change.

## 1. Primary User Journey (The 3-Minute Demo)

**Goal:** Run one interview session, inspect the result, and immediately see how the system improves in the next attempt.

1. **Onboarding:** The user lands on the Reflexa app. A clean, terminal-inspired (but modern) interface explains the value proposition: "Self-Improving Technical Interview Intelligence."
2. **Configuration (Setup):**
   - **Role Selection:** User selects the target role (e.g., "Senior Frontend Engineer").
   - **Difficulty Selection:** User selects the difficulty tier (e.g., "L5 / Senior").
3. **Session Start:** A brief loading state "Spinning up environment..." leads into the live session.
4. **Live Interview Conversation:**
   - The UI is a split-screen or focused chat interface.
   - The AI asks a technical question.
   - The user responds (via text or simulated voice/code).
   - The AI adapts and asks follow-ups based on the user's input.
5. **Post-Session Analysis:** Upon completion, the session ends. A structured breakdown of performance appears, focusing on the Rubric.
6. **Next-Session Improvement (The Loop):** The user clicks "Apply Feedback to Next Session." The UI visually confirms that the user's specific weak points (e.g., "Problem Decomposition") have been integrated into a "Strategy Document." The next interview configuration automatically targets these areas.

## 2. Primary States

| State                       | User Sees                                           | User Can Do                                     | System Must Do                                     | On Failure                                                     |
| :-------------------------- | :-------------------------------------------------- | :---------------------------------------------- | :------------------------------------------------- | :------------------------------------------------------------- |
| **Idle**                    | Dashboard, past sessions, "New Session" button.     | Start new session, review past.                 | Load user history, maintain readiness.             | Show local cached data or empty state with retry prompt.       |
| **Configuring Session**     | Role, difficulty, and focus area dropdowns.         | Select options, click "Start."                  | Validate configuration payload.                    | Highlight missing/invalid selections.                          |
| **Starting Session**        | Loading indicator ("Connecting...").                | Cancel attempt.                                 | Provision backend resources, connect to AI.        | Fallback to Idle, toast error: "Failed to allocate session."   |
| **Live Interview**          | Chat interface, current question, timer (optional). | Type/speak response, request hint, end session. | Process input, stream AI response, track state.    | Show "Reconnecting..." overlay.                                |
| **Paused / Reconnecting**   | Blurred background, "Connection Lost" spinner.      | Wait, or force end session.                     | Attempt reconnect with exponential backoff.        | After 30s, force end and save partial state.                   |
| **Completed**               | "Session Finished" summary screen.                  | Proceed to evaluation.                          | Save final transcript, trigger evaluation job.     | Queue evaluation for retry, notify user.                       |
| **Evaluating**              | Skeleton loaders for rubric metrics.                | Wait, browse un-evaluated transcript.           | Run AI evaluation pipeline against transcript.     | Show "Evaluation delayed" banner, retry in background.         |
| **Improved Strategy Ready** | Detailed scorecard, highlighted transcript.         | Review feedback, update strategy, start next.   | Highlight key insights, generate strategy updates. | Show raw scores without detailed insights; allow manual retry. |
| **Error / Retry**           | Clear error message with technical detail.          | Click "Retry" or "Return Home."                 | Log error telemetry, provide recovery path.        | Escalate to fatal error boundary.                              |

## 3. Interview Rubric Experience

The UI explicitly measures and displays the following dimensions. They are mirrored precisely in the backend evaluation logic.

- **Follow-up Depth:** How well the user answered nested, complex follow-ups.
- **Specificity:** Use of precise technical terminology vs. vague descriptions.
- **Problem Decomposition:** Breaking down large problems into logical, manageable steps.
- **Correctness Probing:** How the user verified their own assumptions or code.
- **Clarification Behavior:** Did the user ask the right questions before diving into a solution?
- **Pacing:** Was the response time and cadence appropriate for the role level?
- **User Confidence Handling:** Did the user communicate uncertainty constructively?

_UI Implementation:_ Each metric is scored (e.g., Needs Work/Meets/Exceeds) with an expandable section showing exactly where in the transcript this behavior was observed.

## 4. The Improvement Narrative

To demonstrate that the system is learning and adapting to the user:

1. **Low-Scoring Turn Highlighted:** The UI pinpoints exactly where the user failed (e.g., "Missed edge case in binary tree traversal").
2. **Failure Pattern Labeled:** The system categorizes it (e.g., "Pattern: Rushing to implementation without clarifying constraints").
3. **Recommendation Generated:** Actionable advice is provided ("Next time, write out 3 edge cases before writing code").
4. **Strategy Document Updated:** The UI visually updates a persistent "User Strategy Document" (a user profile of strengths/weaknesses).
5. **Next Session Behavior Changes:** Before the next session starts, the system explicitly states: "Focus for this session: Clarifying constraints (based on previous feedback)."

## 5. UX Copy Rules

To maintain credibility and a serious, engineering-focused tone, all copy must adhere to:

- **Clear, technical, and confident tone:** Speak peer-to-peer.
- **No filler text:** Be concise. Don't use "Oops!" or "Uh oh." Use "Connection failed."
- **No fake certainty:** If the AI is unsure of an evaluation, say "Insufficient data to score" rather than guessing.
- **No manipulative gamification:** No badges, streaks, or confetti. Value comes from the insights, not cheap dopamine.
- **No unnecessary jargon in user-facing text:** Be precise but accessible.
