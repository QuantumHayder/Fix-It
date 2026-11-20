## Regression testing
- Goal: make sure existing behaviour still works after a change.
- Cover the main path and the important alternative paths (invalid input, empty fields, cancel/back).
- Each test should check one behaviour so a failure is easy to understand.
- Tests should be repeatable: they must not depend on the order they run in.
