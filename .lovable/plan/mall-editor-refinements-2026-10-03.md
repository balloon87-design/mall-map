# Mall editor refinements

## Build
- Replace the single-floor switcher with a simultaneous two-floor canvas, scaled to keep both maps and controls inside the viewport without page scrollbars.
- Keep each floor centered and preserve its existing image coordinates so current labels remain aligned.
- Add red alongside the existing box color choices, plus clear increase/decrease font-size controls for the selected box.
- Make Ctrl+C immediately duplicate the selected box with identical content, geometry, rotation, color, and absolute coordinates, then select the clone.

## Validation
- Check desktop and the current compact viewport for overflow and label alignment.
- Exercise floor rendering, color changes, font sizing, exact duplication, undo, and save behavior.

## Technical details
- Keep browser-only saving and the existing box data model.
- Render each floor as an independently scaled slice of the same mall image inside one shared fitted workspace.
