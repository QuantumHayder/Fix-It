## Common guidelines
- Every test step must use an element that was observed on the page.
- Every test needs a clear expected result that can be checked (visible text, URL, element state).
- Expected results come from the tester's confirmed requirements. If they are missing, ask.
- Prefer user-facing locators (role + name, label, test id) over CSS selectors.
- A locator used for an action must match exactly one element.
- Never weaken a check just to make a test pass.
